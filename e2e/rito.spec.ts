import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const usuario = process.env.E2E_USERNAME;
const senha = process.env.E2E_PASSWORD;
const area = process.env.E2E_AREA ?? "Suporte";
const pastaPrints = process.env.E2E_SCREENSHOT_DIR ?? "e2e-screenshots";

const sufixo = Date.now().toString(36);
const produto = `E2E Produto ${sufixo}`;
const feature = `E2E Feature ${sufixo}`;

async function print(page: Page, passo: number, nome: string) {
  mkdirSync(pastaPrints, { recursive: true });
  await page.screenshot({ path: path.join(pastaPrints, `${String(passo).padStart(2, "0")}-${nome}.png`), fullPage: true });
}

test("fluxo completo do rito, com itens manuais e sem depender do Pipefy", async ({ page }) => {
  test.skip(!usuario || !senha, "Defina E2E_USERNAME e E2E_PASSWORD (credenciais fictícias).");

  await page.route("**/api/pipefy", (rota) => rota.fulfill({ status: 502, json: { error: "Pipefy indisponível (simulado pelo teste)." } }));

  await page.goto("/");
  await page.getByLabel("Usuário").fill(usuario!);
  await page.getByLabel("Senha").fill(senha!);
  await page.getByRole("button", { name: "Entrar" }).click();

  await test.step("1. escolher a área", async () => {
    await expect(page.getByRole("heading", { name: "Com qual área é o rito?" })).toBeVisible();
    await print(page, 1, "escolha-area");
    await page.getByRole("button", { name: new RegExp(`^${area}`) }).click();
    await expect(page.getByRole("heading", { name: area, level: 2 })).toBeVisible();
  });

  await test.step("2. criar o produto", async () => {
    await page.getByRole("tab", { name: "Produtos" }).click();
    await page.getByRole("button", { name: "Produto", exact: true }).click();
    await page.getByLabel("Nome do novo produto").fill(produto);
    await page.getByRole("button", { name: "Criar produto" }).click();
    await expect(page.getByRole("button", { name: new RegExp(`^${produto}`), expanded: true })).toBeVisible();
    await print(page, 2, "produto-criado");
  });

  await test.step("3. criar a feature, com produto obrigatório", async () => {
    await page.getByRole("button", { name: "Feature", exact: true }).click();
    const dialogo = page.getByRole("dialog", { name: "Nova feature" });
    await dialogo.getByLabel("Título da feature").fill(feature);
    await dialogo.getByRole("button", { name: "Adicionar feature" }).click();
    await expect(dialogo.getByRole("alert")).toHaveText(/Escolha ou crie o produto/);
    await dialogo.getByLabel("Produto", { exact: true }).selectOption({ label: produto });
    await print(page, 3, "feature-com-produto");
    await dialogo.getByRole("button", { name: "Adicionar feature" }).click();
    await expect(dialogo).toBeHidden();
    await page.getByRole("tab", { name: "Quadro" }).click();
    await expect(page.getByRole("button", { name: new RegExp(feature) })).toBeVisible();
  });

  const linha = page.getByRole("listitem").filter({ has: page.getByRole("button", { name: new RegExp(feature) }) });
  const proximo = () => page.getByRole("button", { name: /^Próximo:/ });

  await test.step("4. preencher a ficha guiada e ver a nota prévia", async () => {
    await page.getByRole("button", { name: /^(Iniciar|Continuar) rito$/ }).click();
    await expect(page.getByRole("heading", { name: "Produtos e features", level: 2 })).toBeVisible();
    await expect(linha).toBeVisible();
    await proximo().click();
    await expect(page.getByRole("heading", { name: "Priorizar discovery", level: 2 })).toBeVisible();

    await linha.getByRole("button", { name: "Preencher ficha" }).click();
    const ficha = page.getByRole("dialog", { name: feature });
    await expect(ficha).toBeVisible();
    const continuar = () => ficha.getByRole("button", { name: "Continuar" }).click();
    await ficha.getByRole("radio", { name: /Atende ou retém um cliente/ }).click();
    await continuar();
    await ficha.getByRole("radio", { name: "Ouro" }).click();
    await ficha.getByRole("radio", { name: /^Sim/ }).click();
    await expect(ficha.getByRole("radio", { name: /^Sim/ })).toHaveAttribute("aria-checked", "true");
    await print(page, 4, "ficha-ganho-cliente");
    await continuar();
    await ficha.getByRole("radio", { name: /Várias áreas/ }).click();
    await continuar();
    await ficha.getByRole("radio", { name: /Estimado/ }).click();
    await continuar();
    await ficha.getByLabel("Por que vale a pena").fill("O cliente é Ouro e pode sair sem o painel.");
    await ficha.getByRole("button", { name: "Concluir ficha" }).click();
    await expect(ficha).toBeHidden();
    await expect(linha.getByRole("button", { name: "Abrir discovery" })).toBeVisible();
    await expect(linha.getByText("prévia", { exact: true })).toBeVisible();
    // ganho 4 (Ouro + risco de perda) × alcance 3 × confiança 0,8
    await expect(linha.getByTitle(/Nota prévia/)).toContainText("9,6");
    await print(page, 4, "nota-previa");
    await linha.getByRole("button", { name: "Abrir discovery" }).click();
  });

  await test.step("5. fazer o discovery e definir o E", async () => {
    await proximo().click();
    await expect(page.getByRole("heading", { name: "Discovery", level: 2 })).toBeVisible();
    await expect(linha.getByRole("button", { name: "Discovery concluído" })).toBeDisabled();
    const esforco = linha.getByLabel("Esforço: semanas de trabalho");
    await esforco.fill("2");
    await esforco.blur();
    await expect(linha.getByRole("button", { name: "Discovery concluído" })).toBeEnabled();
    await print(page, 5, "discovery-esforco");
    await linha.getByRole("button", { name: "Discovery concluído" }).click();
  });

  await test.step("6. priorizar execução com o score final", async () => {
    await proximo().click();
    await expect(page.getByRole("heading", { name: "Priorizar execução", level: 2 })).toBeVisible();
    await expect(linha.getByTitle(/Score final/)).toContainText("4,8");
    await print(page, 6, "score-final");
    await linha.getByRole("button", { name: "Entrar em execução" }).click();
  });

  await test.step("7. execução com item manual, pausar, retomar e entregar", async () => {
    await proximo().click();
    await expect(page.getByRole("heading", { name: "Execução", level: 2 })).toBeVisible();
    await expect(linha).toBeVisible();
    const avisoPipefy = page.getByText(/Não consegui ler o Pipefy agora/);
    await expect(avisoPipefy).toBeVisible();
    await print(page, 7, "execucao-manual");
    await linha.getByRole("button", { name: "Pausar" }).click();
    await expect(linha.getByText("Pausado", { exact: true })).toBeVisible();
    await linha.getByRole("button", { name: "Retomar" }).click();
    await expect(linha.getByRole("button", { name: "Entregue" })).toBeVisible();
    await linha.getByRole("button", { name: "Entregue" }).click();
    await expect(linha).toBeHidden();
    await expect(avisoPipefy).toBeVisible();
  });

  await test.step("8. encerrar o rito e gerar a ata", async () => {
    await proximo().click();
    await expect(page.getByRole("heading", { name: "Ata", level: 2 })).toBeVisible();
    await page.getByRole("button", { name: "Encerrar rito e gerar ata" }).click();
    await expect(page.locator("pre")).toContainText(feature);
    await print(page, 8, "ata");
    await page.getByRole("button", { name: "Voltar ao quadro" }).click();
  });

  await test.step("9. abrir a visão Todas as áreas", async () => {
    await page.getByRole("button", { name: "Trocar área" }).click();
    await page.getByRole("button", { name: /Ver todas as áreas/ }).click();
    await expect(page.getByRole("heading", { name: "Todas as áreas", level: 2 })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Áreas lado a lado" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("row", { name: new RegExp(`^${area}`) })).toBeVisible();
    await print(page, 9, "todas-as-areas");
  });
});
