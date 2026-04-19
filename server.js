require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

async function inicializarBanco() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profissionais (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(150) NOT NULL,
      especialidade VARCHAR(100) NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS datas_disponiveis (
      id SERIAL PRIMARY KEY,
      profissional_id INT NOT NULL,
      data_disponivel DATE NOT NULL,
      FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS agendamentos (
      id SERIAL PRIMARY KEY,
      nome_paciente VARCHAR(150) NOT NULL,
      cpf VARCHAR(14) NOT NULL,
      profissional_id INT NOT NULL,
      data_agendamento DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE
    );
  `);

  await pool.query(`
    INSERT INTO profissionais (id, nome, especialidade) VALUES
      (1, 'Dra. Mariana Costa', 'Clínica Geral'),
      (2, 'Dr. Rafael Mendes', 'Cardiologia'),
      (3, 'Fernanda Lima', 'Nutrição'),
      (4, 'Dr. Carlos Henrique', 'Pediatria')
    ON CONFLICT (id) DO NOTHING;
  `);

    await pool.query(`
    INSERT INTO datas_disponiveis (profissional_id, data_disponivel)
    SELECT * FROM (
      VALUES
        (1, '2026-04-22'::date),
        (1, '2026-04-23'::date),
        (1, '2026-04-25'::date),
        (2, '2026-04-24'::date),
        (2, '2026-04-26'::date),
        (2, '2026-04-28'::date),
        (3, '2026-04-21'::date),
        (3, '2026-04-23'::date),
        (3, '2026-04-27'::date),
        (4, '2026-04-22'::date),
        (4, '2026-04-24'::date),
        (4, '2026-04-29'::date)
    ) AS novas_datas(profissional_id, data_disponivel)
    WHERE NOT EXISTS (
      SELECT 1
      FROM datas_disponiveis d
      WHERE d.profissional_id = novas_datas.profissional_id
        AND d.data_disponivel = novas_datas.data_disponivel
    );
  `);

  console.log("Banco inicializado com sucesso.");
}

app.get("/api", (req, res) => {
  res.json({ mensagem: "API do Sistema de Agendamento com PostgreSQL e Docker" });
});

app.get("/api/especialidades", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT especialidade FROM profissionais ORDER BY especialidade"
    );
    res.json(result.rows.map((row) => row.especialidade));
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensagem: "Erro ao buscar especialidades." });
  }
});

app.get("/api/profissionais", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nome, especialidade FROM profissionais ORDER BY nome"
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensagem: "Erro ao buscar profissionais." });
  }
});

app.get("/api/profissionais/especialidade/:especialidade", async (req, res) => {
  try {
    const { especialidade } = req.params;

    const result = await pool.query(
      "SELECT id, nome, especialidade FROM profissionais WHERE LOWER(especialidade) = LOWER($1) ORDER BY nome",
      [especialidade]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensagem: "Erro ao filtrar profissionais." });
  }
});
app.get("/api/profissionais/:id/datas", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT data_disponivel
      FROM datas_disponiveis
      WHERE profissional_id = $1
      ORDER BY data_disponivel
      `,
      [id]
    );

    res.json(result.rows.map(item => item.data_disponivel));
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensagem: "Erro ao buscar datas disponíveis." });
  }
});

app.post("/api/agendamentos", async (req, res) => {
  try {
    const { nome, cpf, profissionalId, data } = req.body;

    if (!nome || !cpf || !profissionalId || !data) {
      return res.status(400).json({
        mensagem: "Preencha nome, CPF, profissional e data."
      });
    }

    const profissionalResult = await pool.query(
      "SELECT * FROM profissionais WHERE id = $1",
      [profissionalId]
    );

    if (profissionalResult.rows.length === 0) {
      return res.status(404).json({
        mensagem: "Profissional não encontrado."
      });
    }

    const disponibilidadeResult = await pool.query(
      "SELECT * FROM datas_disponiveis WHERE profissional_id = $1 AND data_disponivel = $2",
      [profissionalId, data]
    );

    if (disponibilidadeResult.rows.length === 0) {
      return res.status(400).json({
        mensagem: "Data não disponível para este profissional."
      });
    }

    const conflitoResult = await pool.query(
      "SELECT * FROM agendamentos WHERE profissional_id = $1 AND data_agendamento = $2",
      [profissionalId, data]
    );

    if (conflitoResult.rows.length > 0) {
      return res.status(400).json({
        mensagem: "Esta data já foi agendada para este profissional."
      });
    }

    const insertResult = await pool.query(
      `
      INSERT INTO agendamentos (nome_paciente, cpf, profissional_id, data_agendamento)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [nome, cpf, profissionalId, data]
    );

    res.status(201).json({
      mensagem: "Agendamento realizado com sucesso.",
      agendamento: insertResult.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensagem: "Erro ao realizar agendamento." });
  }
});

app.get("/api/agendamentos/cpf/:cpf", async (req, res) => {
  try {
    const { cpf } = req.params;

    const result = await pool.query(
      `
      SELECT
        a.id,
        a.nome_paciente,
        a.cpf,
        a.data_agendamento,
        p.nome AS profissional_nome,
        p.especialidade
      FROM agendamentos a
      JOIN profissionais p ON p.id = a.profissional_id
      WHERE a.cpf = $1
      ORDER BY a.data_agendamento
      `,
      [cpf]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        mensagem: "Nenhum agendamento encontrado para este CPF."
      });
    }

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensagem: "Erro ao consultar agendamentos." });
  }
});

app.delete("/api/agendamentos/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM agendamentos WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        mensagem: "Agendamento não encontrado."
      });
    }

    res.json({
      mensagem: "Agendamento cancelado com sucesso.",
      agendamento: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensagem: "Erro ao cancelar agendamento." });
  }
});

async function iniciarServidor() {
  try {
    await inicializarBanco();
    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Erro ao iniciar aplicação:", error);
  }
}

iniciarServidor();
