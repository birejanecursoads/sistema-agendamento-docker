# Projeto 04 — Sistema com Banco de Dados e Containers

## Descrição

Este projeto consiste na evolução do sistema de agendamento desenvolvido anteriormente, substituindo o armazenamento local em JSON por um **banco de dados PostgreSQL** e utilizando **containers Docker** para executar toda a infraestrutura da aplicação.

O sistema foi dividido em dois serviços principais no `docker-compose`:

* um container para o banco de dados PostgreSQL;
* outro container para a aplicação Node.js com Express.

Dessa forma, toda a estrutura pode ser instanciada de forma padronizada e simplificada com um único comando.

No banco de dados foram criadas tabelas para armazenar:

* profissionais;
* datas disponíveis;
* agendamentos realizados.

Assim, o sistema passa a persistir os dados de forma mais adequada e próxima de um cenário real.

O frontend continua permitindo:

* selecionar a especialidade;
* escolher o profissional;
* visualizar datas disponíveis;
* informar nome e CPF;
* confirmar o agendamento;
* consultar agendamentos por CPF;
* cancelar registros.

Com isso, o projeto demonstra integração entre frontend, backend, banco de dados relacional e containers, atendendo aos requisitos da disciplina de Desenvolvimento Web.

---

## Como executar

Na pasta do projeto, rode:

```bash id="o6d15c"
docker compose up --build
```

Depois abra no navegador:

```text id="4k91vz"
http://localhost:3000
```

---

## Estrutura da Solução

* Frontend em HTML, CSS e JavaScript
* Backend em Node.js com Express
* Banco de dados PostgreSQL
* Containers com Docker
* Orquestração com Docker Compose

---

## Funcionalidades

* Escolha da especialidade
* Escolha do profissional
* Exibição das datas disponíveis
* Agendamento com nome e CPF
* Consulta por CPF
* Cancelamento de agendamento
* Persistência em banco de dados

---

## Tecnologias Utilizadas

* Node.js
* Express
* JavaScript
* HTML5
* CSS3
* PostgreSQL
* Docker
* Docker Compose

---

## Autor

Desenvolvido para a disciplina de **Desenvolvimento Web**.
