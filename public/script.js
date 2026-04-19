const especialidadeSelect = document.getElementById("especialidade");
const profissionalSelect = document.getElementById("profissional");
const dataSelect = document.getElementById("data");
const formAgendamento = document.getElementById("form-agendamento");
const mensagem = document.getElementById("mensagem");
const btnConsultar = document.getElementById("btn-consultar");
const resultadoConsulta = document.getElementById("resultado-consulta");

let profissionais = [];

async function carregarProfissionais() {
  try {
    const resposta = await fetch("/api/profissionais");
    profissionais = await resposta.json();

    especialidadeSelect.innerHTML = '<option value="">Selecione</option>';

    const especialidades = [...new Set(profissionais.map((p) => p.especialidade))];

    especialidades.forEach((especialidade) => {
      const option = document.createElement("option");
      option.value = especialidade;
      option.textContent = especialidade;
      especialidadeSelect.appendChild(option);
    });
  } catch (erro) {
    mensagem.textContent = "Erro ao carregar profissionais.";
    mensagem.style.color = "red";
  }
}

especialidadeSelect.addEventListener("change", () => {
  profissionalSelect.innerHTML = '<option value="">Selecione</option>';
  dataSelect.innerHTML = '<option value="">Selecione</option>';

  const especialidadeSelecionada = especialidadeSelect.value;

  const filtrados = profissionais.filter(
    (p) => p.especialidade === especialidadeSelecionada
  );

  filtrados.forEach((profissional) => {
    const option = document.createElement("option");
    option.value = profissional.id;
    option.textContent = profissional.nome;
    profissionalSelect.appendChild(option);
  });
});

profissionalSelect.addEventListener("change", async () => {
  dataSelect.innerHTML = '<option value="">Selecione</option>';

  const profissionalId = profissionalSelect.value;
  if (!profissionalId) return;

  try {
    const resposta = await fetch(`/api/profissionais/${profissionalId}/datas`);
    const datas = await resposta.json();

    console.log("Datas recebidas:", datas);

    if (!Array.isArray(datas)) {
      console.error("Resposta inválida da API:", datas);
      return;
    }

    datas.forEach((dataIso) => {
      const dataObj = new Date(dataIso);

      const dataFormatada = dataObj.toLocaleDateString("pt-BR", {
        timeZone: "UTC"
      });

      const option = document.createElement("option");
      option.value = dataIso;
      option.textContent = dataFormatada;
      dataSelect.appendChild(option);
    });
  } catch (erro) {
    console.error("Erro ao carregar datas:", erro);
  }
});

formAgendamento.addEventListener("submit", async (e) => {
  e.preventDefault();

  const dados = {
    nome: document.getElementById("nome").value.trim(),
    cpf: document.getElementById("cpf").value.trim(),
    profissionalId: Number(profissionalSelect.value),
    data: dataSelect.value
  };

  const resposta = await fetch("/api/agendamentos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(dados)
  });

  const resultado = await resposta.json();

  mensagem.textContent = resultado.mensagem;
  mensagem.style.color = resposta.ok ? "green" : "red";

  if (resposta.ok) {
    formAgendamento.reset();
    profissionalSelect.innerHTML = '<option value="">Selecione</option>';
    dataSelect.innerHTML = '<option value="">Selecione</option>';
  }
});

btnConsultar.addEventListener("click", async () => {
  const cpf = document.getElementById("cpf-consulta").value.trim();

  if (!cpf) {
    resultadoConsulta.innerHTML = "<p style='color:red;'>Informe um CPF.</p>";
    return;
  }

  const resposta = await fetch(`/api/agendamentos/${cpf}`);
  const resultado = await resposta.json();

  if (!resposta.ok) {
    resultadoConsulta.innerHTML = `<p style="color:red;">${resultado.mensagem}</p>`;
    return;
  }

  resultadoConsulta.innerHTML = "";

  resultado.forEach((agendamento) => {
    const div = document.createElement("div");
    div.className = "resultado-item";

    div.innerHTML = `
      <p><strong>Nome:</strong> ${agendamento.nome}</p>
      <p><strong>CPF:</strong> ${agendamento.cpf}</p>
      <p><strong>Especialidade:</strong> ${agendamento.especialidade}</p>
      <p><strong>Profissional:</strong> ${agendamento.profissionalNome}</p>
      <p><strong>Data:</strong> ${agendamento.data}</p>
      <button class="btn-cancelar" onclick="cancelarAgendamento(${agendamento.id})">Cancelar Agendamento</button>
    `;

    resultadoConsulta.appendChild(div);
  });
});

async function cancelarAgendamento(id) {
  const resposta = await fetch(`/api/agendamentos/${id}`, {
    method: "DELETE"
  });

  const resultado = await resposta.json();
  alert(resultado.mensagem);

  document.getElementById("cpf-consulta").value = "";
  resultadoConsulta.innerHTML = "";
}

carregarProfissionais();
