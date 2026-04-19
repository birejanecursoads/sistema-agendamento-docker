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
  password: process.env.DB_PASSWORD
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

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
      SELECT d.data_disponivel
      FROM datas_disponiveis d
      WHERE d.profissional_id = $1
      AND d.data_disponivel NOT IN (
        SELECT a.data_agendamento
        FROM agendamentos a
        WHERE a.profissional_id = $1
      )
      ORDER BY d.data_disponivel
      `,
      [id]
    );

    res.json(result.rows.map((row) => row.data_disponivel));
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

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
