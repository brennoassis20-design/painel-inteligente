"use client";

import { useCallback, useEffect, useState } from "react";
import Login from "../Login";
import ImageField from "./ImageField";
import "./admin.css";
import { api, areaBase, areaSlug, AuthError, brl, readSession } from "../session";

type Product = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_url: string | null;
  banner_url: string | null;
  trailer_youtube: string | null;
  color: string;
  price_cents: number | null;
  checkout_url: string | null;
  checkout_provider: string;
  sales_page_url: string | null;
  external_ids: string[];
  access_days: number | null;
  position: number;
  published: boolean;
  featured: boolean;
  badge: string | null;
  upsell_product_id: string | null;
  upsell_text: string | null;
  special: string | null;
  is_free?: boolean;
  on_promo?: boolean;
  promo_price_cents?: number | null;
  promo_checkout_url?: string | null;
};

type Lesson = {
  id: string;
  title: string;
  description: string | null;
  youtube_id: string | null;
  duration_min: number | null;
  materials: { titulo: string; url: string }[];
  free_preview: boolean;
  published: boolean;
};
type Module = { id: string; title: string; release_days: number; cover_url?: string | null; lessons: Lesson[] };

type Summary = {
  aparencia: { brand_name: string; logo_url: string | null; accent: string; hero_product_id: string | null; hero_title: string | null; hero_text: string | null; support_url: string | null; meta_pixel_id?: string | null;
    bg_color?: string; hero_image_url?: string | null; hero_image_mobile_url?: string | null;
    promo_enabled?: boolean; promo_title?: string; promo_text?: string | null; promo_ends_at?: string | null; promo_color?: string; promo_card?: boolean; promo_notify?: boolean };
  alunos_unicos: number;
  produtos: { id: string; slug: string; titulo: string; publicado: boolean; preco: number | null; checkout: string; tem_checkout: boolean; aulas: number; alunos: number; funil_30d: Record<string, number> }[];
};

const op = <T,>(name: string, args: Record<string, unknown> = {}) => api<T>("/api/membros/admin", { body: { op: name, args } });

const TABS = [
  ["produtos", "Produtos"],
  ["conteudo", "Aulas"],
  ["gratis", "Grátis e avisos"],
  ["promocao", "Promoção"],
  ["aparencia", "Aparência"],
  ["vendas", "Vendas e integrações"],
  ["ia", "Conectar IA"],
  ["produtores", "Produtores"],
] as const;
type Tab = (typeof TABS)[number][0];

export default function AdminPage() {
  const [logged, setLogged] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("produtos");
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [info, setInfo] = useState<{ principal: boolean; admin_plataforma: boolean; endereco: string } | null>(null);

  const flash = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(""), 2600);
  }, []);

  const reload = useCallback(async () => {
    try {
      const [list, resume, area] = await Promise.all([
        op<Product[]>("listar_produtos"),
        op<Summary>("resumo_area"),
        op<{ principal: boolean; admin_plataforma: boolean; endereco: string }>("area_info"),
      ]);
      setProducts(list);
      setSummary(resume);
      setInfo(area);
      setError("");
    } catch (err) {
      if (err instanceof AuthError) setLogged(false);
      else setError(err instanceof Error ? err.message : "Erro ao carregar.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê a sessão guardada no navegador
    setLogged(Boolean(readSession()));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca os dados do servidor
    if (logged) void reload();
  }, [logged, reload]);

  if (logged === null) return <div className="gp" />;
  if (!logged) {
    return (
      <div className="gp">
        <Login brand={areaSlug() ? "Configurar sua área" : "Gênio Play · Configurar"} onDone={() => setLogged(true)} />
      </div>
    );
  }

  const home = areaBase() || "/";

  return (
    <div className="gp">
      <header className="gp-top gp-wrap">
        <a className="gp-logo" href={home}>
          <i />
          {summary?.aparencia.brand_name || (areaSlug() ? "" : "Gênio Play")}
        </a>
        <nav className="gp-nav">
          {/* Quem administra a plataforma, dentro da área de um produtor, volta para a principal em um clique. */}
          {info?.admin_plataforma && !info.principal && <a href={`${/^\/membros(\/|$)/.test(window.location.pathname) ? "/membros" : ""}/admin`}>← Gênio Play (Produtores)</a>}
          <a href={home}>Ver como aluno</a>
        </nav>
      </header>
      <main className="gp-wrap gp-admin">
        <div className="gp-tabs" role="tablist">
          {TABS.filter(([key]) => key !== "produtores" || (info?.principal && info.admin_plataforma)).map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? "is-on" : ""} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>
        {error && <p className="gp-error">{error}</p>}
        {tab === "produtos" && <ProductsTab products={products} summary={summary} reload={reload} flash={flash} />}
        {tab === "conteudo" && <ContentTab products={products} flash={flash} />}
        {tab === "gratis" && <FreeTab products={products} flash={flash} />}
        {tab === "promocao" && summary && <PromoTab summary={summary} products={products} reload={reload} flash={flash} />}
        {tab === "aparencia" && summary && <LookTab summary={summary} products={products} reload={reload} flash={flash} />}
        {tab === "vendas" && <SalesTab summary={summary} flash={flash} />}
        {tab === "ia" && <AiTab flash={flash} />}
        {tab === "produtores" && info?.principal && info.admin_plataforma && <ProducersTab flash={flash} />}
      </main>
      {toast && <div className="gp-toast" role="status">{toast}</div>}
    </div>
  );
}

// ------------------------------------------------------------------ produtos

const EMPTY: Partial<Product> = { title: "", color: "#F2B441", checkout_provider: "hotmart", external_ids: [], published: false, featured: false };

function ProductsTab({ products, summary, reload, flash }: { products: Product[]; summary: Summary | null; reload: () => Promise<void>; flash: (t: string) => void }) {
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function move(index: number, delta: number) {
    const ids = products.map((product) => product.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await op("reordenar", { tipo: "produtos", ids });
    await reload();
  }

  if (editing) {
    return (
      <ProductForm
        initial={editing}
        products={products}
        onCancel={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await reload();
          flash("Produto salvo.");
        }}
      />
    );
  }

  return (
    <section className="gp-panel">
      <div className="gp-btns">
        <button type="button" className="gp-btn gp-btn-gold" onClick={() => setEditing(EMPTY)}>
          + Novo produto
        </button>
      </div>
      {products.length === 0 && <p className="gp-muted">Nenhum produto ainda. Crie o primeiro aqui ou peça para a IA criar pelo conector.</p>}
      <div className="gp-list">
        {products.map((product, index) => {
          const info = summary?.produtos.find((row) => row.id === product.id);
          return (
            <div className="gp-item" key={product.id}>
              <span className="gp-thumb" style={{ backgroundImage: product.cover_url ? `url("${product.cover_url}")` : `linear-gradient(160deg, ${product.color}, #0a0c12)` }} />
              <div className="gp-item-main">
                <b>{product.title}</b>
                <small>
                  {brl(product.price_cents) || "sem preço"} · {product.checkout_url ? product.checkout_provider : "sem checkout"} · {info?.aulas ?? 0} aulas · {info?.alunos ?? 0} alunos
                  {product.external_ids.length === 0 && " · falta id da venda"}
                </small>
              </div>
              {product.is_free && <span className="gp-pill on">Grátis</span>}
              {product.on_promo && product.promo_price_cents ? <span className="gp-pill warn">Promo {brl(product.promo_price_cents)}</span> : null}
              <span className={`gp-pill ${product.published ? "on" : "warn"}`}>{product.published ? "Publicado" : "Rascunho"}</span>
              <div className="gp-item-actions">
                <button type="button" className="gp-btn gp-btn-ghost gp-btn-sm" onClick={() => void move(index, -1)} aria-label="Subir">
                  ↑
                </button>
                <button type="button" className="gp-btn gp-btn-ghost gp-btn-sm" onClick={() => void move(index, 1)} aria-label="Descer">
                  ↓
                </button>
                <button type="button" className="gp-btn gp-btn-ghost gp-btn-sm" onClick={() => setEditing(product)}>
                  Editar
                </button>
                {confirmDelete === product.id ? (
                  <button
                    type="button"
                    className="gp-btn gp-btn-danger gp-btn-sm"
                    onClick={async () => {
                      await op("remover_produto", { produto: product.id, confirmar: true });
                      setConfirmDelete(null);
                      await reload();
                      flash("Produto apagado.");
                    }}
                  >
                    Confirmar exclusão
                  </button>
                ) : (
                  <button type="button" className="gp-btn gp-btn-danger gp-btn-sm" onClick={() => setConfirmDelete(product.id)}>
                    Apagar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ProductForm({ initial, products, onCancel, onSaved }: { initial: Partial<Product>; products: Product[]; onCancel: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({
    titulo: initial.title || "",
    subtitulo: initial.subtitle || "",
    descricao: initial.description || "",
    capa_url: initial.cover_url || "",
    banner_url: initial.banner_url || "",
    trailer_youtube: initial.trailer_youtube ? `https://youtu.be/${initial.trailer_youtube}` : "",
    cor: initial.color || "#F2B441",
    preco: initial.price_cents ? String(initial.price_cents / 100).replace(".", ",") : "",
    checkout_url: initial.checkout_url || "",
    checkout_plataforma: initial.checkout_provider || "hotmart",
    pagina_vendas_url: initial.sales_page_url || "",
    ids_externos: (initial.external_ids || []).join(", "),
    dias_de_acesso: initial.access_days ? String(initial.access_days) : "",
    selo: initial.badge || "",
    publicado: Boolean(initial.published),
    destaque: Boolean(initial.featured),
    especial: initial.special || "",
    gratuito: Boolean(initial.is_free),
    em_promocao: Boolean(initial.on_promo),
    preco_promocional: initial.promo_price_cents ? String(initial.promo_price_cents / 100).replace(".", ",") : "",
    checkout_promocional: initial.promo_checkout_url || "",
    upsell: initial.upsell_product_id || "",
    upsell_texto: initial.upsell_text || "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [key]: event.target.type === "checkbox" ? (event.target as HTMLInputElement).checked : event.target.value });

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const args = {
        titulo: form.titulo,
        subtitulo: form.subtitulo,
        descricao: form.descricao,
        capa_url: form.capa_url,
        banner_url: form.banner_url,
        trailer_youtube: form.trailer_youtube,
        cor: form.cor,
        preco: form.preco ? Number(form.preco.replace(",", ".")) : "",
        checkout_url: form.checkout_url,
        checkout_plataforma: form.checkout_plataforma,
        pagina_vendas_url: form.pagina_vendas_url,
        ids_externos: form.ids_externos.split(/[,\n]/).map((id) => id.trim()).filter(Boolean),
        dias_de_acesso: form.dias_de_acesso ? Number(form.dias_de_acesso) : "",
        selo: form.selo,
        publicado: form.publicado,
        destaque: form.destaque,
        especial: form.especial,
        gratuito: form.gratuito,
        em_promocao: form.em_promocao,
        preco_promocional: form.preco_promocional ? Number(form.preco_promocional.replace(",", ".")) : "",
        checkout_promocional: form.checkout_promocional,
      };
      if (args.em_promocao && (!args.preco_promocional || (args.preco && Number(args.preco_promocional) >= Number(args.preco)))) {
        throw new Error("O preço promocional precisa ser menor que o preço normal.");
      }
      const saved = initial.id
        ? await op<Product>("atualizar_produto", { produto: initial.id, ...args })
        : await op<Product>("criar_produto", args);
      await op("configurar_upsell", { produto: saved.id, oferecer: form.upsell, texto: form.upsell_texto });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="gp-panel" onSubmit={save}>
      <h2>{initial.id ? `Editar: ${initial.title}` : "Novo produto"}</h2>
      <div className="gp-box">
        <h3>Vitrine</h3>
        <div className="gp-grid2">
          <label className="gp-field">
            <span>Nome</span>
            <input id="pf-titulo" required value={form.titulo} onChange={set("titulo")} />
            <small>Sem guia, ebook, apostila ou leitura no nome.</small>
          </label>
          <label className="gp-field">
            <span>Frase curta</span>
            <input id="pf-sub" value={form.subtitulo} onChange={set("subtitulo")} />
          </label>
        </div>
        <label className="gp-field">
          <span>Descrição (aparece no cadeado e na página do produto)</span>
          <textarea id="pf-desc" value={form.descricao} onChange={set("descricao")} />
        </label>
        <div className="gp-grid2">
          <ImageField label="Capa do produto (vitrine)" kind="capa" value={form.capa_url} onChange={(url) => setForm((f) => ({ ...f, capa_url: url }))} />
          <ImageField label="Banner do produto (destaque e cadeado)" kind="banner" value={form.banner_url} onChange={(url) => setForm((f) => ({ ...f, banner_url: url }))} />
          <label className="gp-field">
            <span>Trailer (link do YouTube)</span>
            <input id="pf-trailer" value={form.trailer_youtube} onChange={set("trailer_youtube")} />
          </label>
          <label className="gp-field">
            <span>Cor do card (sem capa)</span>
            <input id="pf-cor" type="color" value={form.cor} onChange={set("cor")} />
          </label>
          <label className="gp-field">
            <span>Selo no card</span>
            <input id="pf-selo" value={form.selo} onChange={set("selo")} placeholder="Novo, Mais vendido…" />
          </label>
          <label className="gp-field">
            <span>Dias de acesso (vazio = vitalício)</span>
            <input id="pf-dias" inputMode="numeric" value={form.dias_de_acesso} onChange={set("dias_de_acesso")} />
          </label>
        </div>
        <label className="gp-check-field">
          <input id="pf-pub" type="checkbox" checked={form.publicado} onChange={set("publicado")} /> Publicado (aparece para os alunos)
        </label>
        {!initial.published && form.publicado && <small className="gp-fine">Ao salvar publicado, todos os alunos (grátis e compradores) recebem um aviso no sino e no celular.</small>}
        <label className="gp-check-field">
          <input id="pf-gratis" type="checkbox" checked={form.gratuito} onChange={set("gratuito")} /> Conteúdo gratuito (qualquer pessoa cadastrada assiste; os pagos ficam com cadeado)
        </label>
        <label className="gp-check-field">
          <input id="pf-dest" type="checkbox" checked={form.destaque} onChange={set("destaque")} /> Pode aparecer no banner da tela inicial
        </label>
        {!areaSlug() && (
          <label className="gp-check-field">
            <input id="pf-painel" type="checkbox" checked={form.especial === "painel"} onChange={(e) => setForm({ ...form, especial: e.target.checked ? "painel" : "" })} /> Também libera o Painel Inteligente (Método Gênio)
          </label>
        )}
      </div>

      <div className="gp-box">
        <h3>Venda</h3>
        <div className="gp-grid2">
          <label className="gp-field">
            <span>Preço (R$)</span>
            <input id="pf-preco" inputMode="decimal" value={form.preco} onChange={set("preco")} placeholder="27,00" />
          </label>
          <label className="gp-field">
            <span>Plataforma do checkout</span>
            <select id="pf-plat" value={form.checkout_plataforma} onChange={set("checkout_plataforma")}>
              <option value="eduzz">Eduzz</option>
              <option value="hotmart">Hotmart</option>
              <option value="cakto">Cakto</option>
              <option value="greenn">Greenn</option>
              <option value="kiwify">Kiwify</option>
              <option value="asaas">Asaas</option>
              <option value="outro">Outra</option>
            </select>
          </label>
        </div>
        <label className="gp-field">
          <span>Link do checkout</span>
          <input id="pf-checkout" value={form.checkout_url} onChange={set("checkout_url")} placeholder="https://pay.hotmart.com/..." />
          <small>O nome e o e-mail do aluno vão preenchidos automaticamente.</small>
        </label>
        <label className="gp-field">
          <span>Ids do produto nas plataformas</span>
          <input id="pf-ids" value={form.ids_externos} onChange={set("ids_externos")} placeholder="hotmart:1234567, cakto:uuid-do-produto" />
          <small>É por aqui que a venda libera o acesso sozinha. Formato plataforma:id, separados por vírgula.</small>
        </label>
        <label className="gp-field">
          <span>Página de vendas (opcional)</span>
          <input id="pf-pagina" value={form.pagina_vendas_url} onChange={set("pagina_vendas_url")} />
        </label>
      </div>

      <div className="gp-box">
        <h3>Promoção</h3>
        <label className="gp-switch">
          <input id="pf-promo" type="checkbox" checked={form.em_promocao} onChange={set("em_promocao")} />
          <span>
            Este produto entra na promoção
            <small>Só aparece com desconto enquanto a promoção estiver ligada na aba Promoção.</small>
          </span>
        </label>
        <div className="gp-grid2">
          <label className="gp-field">
            <span>Preço com desconto (R$)</span>
            <input id="pf-promo-preco" inputMode="decimal" value={form.preco_promocional} onChange={set("preco_promocional")} placeholder="19,90" />
          </label>
          <label className="gp-field">
            <span>Link do checkout com desconto</span>
            <input id="pf-promo-checkout" value={form.checkout_promocional} onChange={set("checkout_promocional")} placeholder="https://..." />
            <small>Precisa cobrar o preço com desconto. Sem ele, o aluno cai no checkout normal (preço cheio).</small>
          </label>
        </div>
      </div>

      <div className="gp-box">
        <h3>Oferta no fim das aulas (upsell)</h3>
        <div className="gp-grid2">
          <label className="gp-field">
            <span>Oferecer este produto</span>
            <select id="pf-upsell" value={form.upsell} onChange={set("upsell")}>
              <option value="">Nenhum</option>
              {products
                .filter((product) => product.id !== initial.id)
                .map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.title}
                  </option>
                ))}
            </select>
          </label>
          <label className="gp-field">
            <span>Chamada da oferta</span>
            <input id="pf-upsell-txt" value={form.upsell_texto} onChange={set("upsell_texto")} placeholder="Quem fez este também levou" />
          </label>
        </div>
      </div>

      {error && <p className="gp-error">{error}</p>}
      <div className="gp-btns">
        <button type="submit" className="gp-btn gp-btn-gold" disabled={busy}>
          {busy ? "Salvando…" : "Salvar produto"}
        </button>
        <button type="button" className="gp-btn gp-btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ aulas

function ContentTab({ products, flash }: { products: Product[]; flash: (t: string) => void }) {
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [modules, setModules] = useState<Module[]>([]);
  const [newModule, setNewModule] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!productId) return;
    try {
      const data = await op<{ modulos: Module[] }>("ver_produto", { produto: productId });
      setModules(data.modulos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
    }
  }, [productId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca os dados do servidor
    void load();
  }, [load]);

  async function run(name: string, args: Record<string, unknown>, message: string) {
    setError("");
    try {
      await op(name, args);
      await load();
      flash(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  if (!products.length) return <p className="gp-muted">Crie um produto primeiro.</p>;

  return (
    <section className="gp-panel">
      <label className="gp-field">
        <span>Produto</span>
        <select id="ct-produto" value={productId} onChange={(e) => setProductId(e.target.value)}>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.title}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="gp-error">{error}</p>}

      {modules.map((module, index) => (
        <ModuleEditor
          key={module.id}
          module={module}
          onRun={run}
          onMove={async (delta) => {
            const ids = modules.map((entry) => entry.id);
            const target = index + delta;
            if (target < 0 || target >= ids.length) return;
            [ids[index], ids[target]] = [ids[target], ids[index]];
            await run("reordenar", { tipo: "modulos", ids }, "Ordem salva.");
          }}
        />
      ))}

      <form
        className="gp-box"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!newModule.trim()) return;
          await run("criar_modulo", { produto: productId, titulo: newModule.trim() }, "Módulo criado.");
          setNewModule("");
        }}
      >
        <h3>Novo módulo</h3>
        <div className="gp-copy">
          <input id="ct-novo-modulo" className="gp-code" style={{ fontFamily: "inherit", fontSize: 15 }} value={newModule} onChange={(e) => setNewModule(e.target.value)} placeholder="Ex.: Módulo 1 · Comece aqui" />
          <button type="submit" className="gp-btn gp-btn-gold">
            Criar
          </button>
        </div>
      </form>
    </section>
  );
}

function ModuleEditor({ module, onRun, onMove }: { module: Module; onRun: (name: string, args: Record<string, unknown>, message: string) => Promise<void>; onMove: (delta: number) => Promise<void> }) {
  const [title, setTitle] = useState(module.title);
  const [release, setRelease] = useState(String(module.release_days || 0));
  const [cover, setCover] = useState(module.cover_url || "");
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="gp-module-box">
      <div className="gp-module-head">
        <input className="gp-code" style={{ flex: 1, minWidth: 160, fontFamily: "inherit", fontSize: 15 }} aria-label="Título do módulo" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label className="gp-field" style={{ width: 150 }}>
          <span>Libera após (dias)</span>
          <input inputMode="numeric" value={release} onChange={(e) => setRelease(e.target.value)} />
        </label>
        <button type="button" className="gp-btn gp-btn-ghost gp-btn-sm" onClick={() => void onRun("atualizar_modulo", { modulo: module.id, titulo: title, liberar_apos_dias: Number(release || 0) }, "Módulo salvo.")}>
          Salvar
        </button>
        <button type="button" className="gp-btn gp-btn-ghost gp-btn-sm" onClick={() => void onMove(-1)} aria-label="Subir módulo">
          ↑
        </button>
        <button type="button" className="gp-btn gp-btn-ghost gp-btn-sm" onClick={() => void onMove(1)} aria-label="Descer módulo">
          ↓
        </button>
        {confirmDelete ? (
          <button type="button" className="gp-btn gp-btn-danger gp-btn-sm" onClick={() => void onRun("remover_modulo", { modulo: module.id, confirmar: true }, "Módulo apagado.")}>
            Confirmar exclusão
          </button>
        ) : (
          <button type="button" className="gp-btn gp-btn-danger gp-btn-sm" onClick={() => setConfirmDelete(true)}>
            Apagar
          </button>
        )}
      </div>
      <ImageField
        label="Capa do módulo"
        kind="modulo"
        value={cover}
        onChange={(url) => {
          setCover(url);
          void onRun("atualizar_modulo", { modulo: module.id, capa_url: url }, url ? "Capa do módulo salva." : "Capa removida.");
        }}
      />
      <div className="gp-list">
        {module.lessons.map((lesson, index) => (
          <LessonEditor
            key={lesson.id}
            lesson={lesson}
            onRun={onRun}
            onMove={async (delta) => {
              const ids = module.lessons.map((entry) => entry.id);
              const target = index + delta;
              if (target < 0 || target >= ids.length) return;
              [ids[index], ids[target]] = [ids[target], ids[index]];
              await onRun("reordenar", { tipo: "aulas", ids }, "Ordem salva.");
            }}
          />
        ))}
      </div>
      {adding ? (
        <LessonForm
          onCancel={() => setAdding(false)}
          onSave={async (args) => {
            await onRun("criar_aula", { ...args, modulo: module.id }, "Aula criada.");
            setAdding(false);
          }}
          moduleId={module.id}
        />
      ) : (
        <button type="button" className="gp-btn gp-btn-ghost gp-btn-sm" style={{ justifySelf: "start" }} onClick={() => setAdding(true)}>
          + Nova aula
        </button>
      )}
    </div>
  );
}

function LessonEditor({ lesson, onRun, onMove }: { lesson: Lesson; onRun: (name: string, args: Record<string, unknown>, message: string) => Promise<void>; onMove: (delta: number) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (open) {
    return (
      <LessonForm
        lesson={lesson}
        onCancel={() => setOpen(false)}
        onSave={async (args) => {
          await onRun("atualizar_aula", { aula: lesson.id, ...args }, "Aula salva.");
          setOpen(false);
        }}
      />
    );
  }

  return (
    <div className="gp-item">
      <div className="gp-item-main">
        <b>{lesson.title}</b>
        <small>
          {lesson.youtube_id ? "YouTube ✓" : "sem vídeo"}
          {lesson.duration_min ? ` · ${lesson.duration_min} min` : ""}
          {lesson.materials.length ? ` · ${lesson.materials.length} material(is)` : ""}
          {lesson.free_preview ? " · grátis" : ""}
          {!lesson.published ? " · escondida" : ""}
        </small>
      </div>
      <div className="gp-item-actions">
        <button type="button" className="gp-btn gp-btn-ghost gp-btn-sm" onClick={() => void onMove(-1)} aria-label="Subir aula">
          ↑
        </button>
        <button type="button" className="gp-btn gp-btn-ghost gp-btn-sm" onClick={() => void onMove(1)} aria-label="Descer aula">
          ↓
        </button>
        <button type="button" className="gp-btn gp-btn-ghost gp-btn-sm" onClick={() => setOpen(true)}>
          Editar
        </button>
        {confirmDelete ? (
          <button type="button" className="gp-btn gp-btn-danger gp-btn-sm" onClick={() => void onRun("remover_aula", { aula: lesson.id, confirmar: true }, "Aula apagada.")}>
            Confirmar
          </button>
        ) : (
          <button type="button" className="gp-btn gp-btn-danger gp-btn-sm" onClick={() => setConfirmDelete(true)}>
            Apagar
          </button>
        )}
      </div>
    </div>
  );
}

function LessonForm({ lesson, moduleId, onSave, onCancel }: { lesson?: Lesson; moduleId?: string; onSave: (args: Record<string, unknown>) => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState({
    titulo: lesson?.title || "",
    youtube: lesson?.youtube_id ? `https://youtu.be/${lesson.youtube_id}` : "",
    descricao: lesson?.description || "",
    duracao_min: lesson?.duration_min ? String(lesson.duration_min) : "",
    materiais: (lesson?.materials || []).map((item) => `${item.titulo} | ${item.url}`).join("\n"),
    aula_gratis: Boolean(lesson?.free_preview),
    publicada: lesson ? lesson.published : true,
  });
  const [busy, setBusy] = useState(false);
  const id = lesson?.id || moduleId || "nova";

  return (
    <form
      className="gp-box"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        await onSave({
          titulo: form.titulo,
          youtube: form.youtube,
          descricao: form.descricao,
          duracao_min: form.duracao_min ? Number(form.duracao_min) : null,
          materiais: form.materiais
            .split("\n")
            .map((line) => line.split("|").map((part) => part.trim()))
            .filter((parts) => parts.length === 2 && parts[1])
            .map(([titulo, url]) => ({ titulo, url })),
          aula_gratis: form.aula_gratis,
          publicada: form.publicada,
        });
        setBusy(false);
      }}
    >
      <div className="gp-grid2">
        <label className="gp-field">
          <span>Título da aula</span>
          <input id={`lf-t-${id}`} required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
        </label>
        <label className="gp-field">
          <span>Link do YouTube (pode ser não listado)</span>
          <input id={`lf-y-${id}`} value={form.youtube} onChange={(e) => setForm({ ...form, youtube: e.target.value })} placeholder="https://youtu.be/..." />
        </label>
      </div>
      <label className="gp-field">
        <span>Texto abaixo do vídeo</span>
        <textarea id={`lf-d-${id}`} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
      </label>
      <div className="gp-grid2">
        <label className="gp-field">
          <span>Duração (min)</span>
          <input id={`lf-m-${id}`} inputMode="numeric" value={form.duracao_min} onChange={(e) => setForm({ ...form, duracao_min: e.target.value })} />
        </label>
        <label className="gp-field">
          <span>Materiais (um por linha: nome | link)</span>
          <textarea id={`lf-mat-${id}`} value={form.materiais} onChange={(e) => setForm({ ...form, materiais: e.target.value })} placeholder="Planilha de preços | https://..." />
        </label>
      </div>
      <label className="gp-check-field">
        <input type="checkbox" checked={form.aula_gratis} onChange={(e) => setForm({ ...form, aula_gratis: e.target.checked })} /> Aula grátis (quem não comprou também assiste)
      </label>
      <label className="gp-check-field">
        <input type="checkbox" checked={form.publicada} onChange={(e) => setForm({ ...form, publicada: e.target.checked })} /> Publicada
      </label>
      <div className="gp-btns">
        <button type="submit" className="gp-btn gp-btn-gold gp-btn-sm" disabled={busy}>
          {busy ? "Salvando…" : "Salvar aula"}
        </button>
        <button type="button" className="gp-btn gp-btn-ghost gp-btn-sm" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ aparência

function LookTab({ summary, products, reload, flash }: { summary: Summary; products: Product[]; reload: () => Promise<void>; flash: (t: string) => void }) {
  const look = summary.aparencia;
  const [form, setForm] = useState({
    nome: look.brand_name,
    logo_url: look.logo_url || "",
    cor: look.accent,
    produto_destaque: look.hero_product_id || "",
    titulo_banner: look.hero_title || "",
    texto_banner: look.hero_text || "",
    suporte_url: look.support_url || "",
    pixel_meta: look.meta_pixel_id || "",
    cor_fundo: look.bg_color || "#0A0C12",
    capa_inicio: look.hero_image_url || "",
    capa_inicio_celular: look.hero_image_mobile_url || "",
  });
  const hex = (value: string) => /^#[0-9a-f]{6}$/i.test(value);
  const [error, setError] = useState("");

  return (
    <form
      className="gp-panel"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          if (!hex(form.cor) || !hex(form.cor_fundo)) throw new Error("Use cores no formato #RRGGBB.");
          const [r, g, b] = [1, 3, 5].map((i) => parseInt(form.cor_fundo.slice(i, i + 2), 16) / 255);
          if (0.2126 * r + 0.7152 * g + 0.0722 * b > 0.3) throw new Error("A cor de fundo está clara demais: os textos da área são claros e ficariam ilegíveis. Escolha um tom escuro.");
          await op("configurar_aparencia", form);
          await reload();
          flash("Aparência salva.");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Não foi possível salvar.");
        }
      }}
    >
      <div className="gp-box">
        <div className="gp-grid2">
          <label className="gp-field">
            <span>Nome da área</span>
            <input id="lk-nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </label>
          <div className="gp-field">
            <span>Cor dos botões</span>
            <div className="gp-color-row">
              <input id="lk-cor" type="color" aria-label="Cor dos botões" value={hex(form.cor) ? form.cor : "#F2B441"} onChange={(e) => setForm({ ...form, cor: e.target.value })} />
              <input type="text" aria-label="Cor dos botões em código" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} />
            </div>
            <small>O texto do botão fica claro ou escuro sozinho, conforme a cor.</small>
          </div>
          <div className="gp-field">
            <span>Cor de fundo</span>
            <div className="gp-color-row">
              <input id="lk-fundo" type="color" aria-label="Cor de fundo" value={hex(form.cor_fundo) ? form.cor_fundo : "#0A0C12"} onChange={(e) => setForm({ ...form, cor_fundo: e.target.value })} />
              <input type="text" aria-label="Cor de fundo em código" value={form.cor_fundo} onChange={(e) => setForm({ ...form, cor_fundo: e.target.value })} />
            </div>
            <small>Fundos escuros deixam as capas e os textos mais legíveis.</small>
          </div>
          <label className="gp-field">
            <span>Produto do banner principal</span>
            <select id="lk-destaque" value={form.produto_destaque} onChange={(e) => setForm({ ...form, produto_destaque: e.target.value })}>
              <option value="">Automático (primeiro marcado como destaque)</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.title}
                </option>
              ))}
            </select>
          </label>
          <label className="gp-field">
            <span>Título do banner (opcional)</span>
            <input id="lk-titulo" value={form.titulo_banner} onChange={(e) => setForm({ ...form, titulo_banner: e.target.value })} />
          </label>
          <label className="gp-field">
            <span>Link de suporte (WhatsApp ou página)</span>
            <input id="lk-suporte" value={form.suporte_url} onChange={(e) => setForm({ ...form, suporte_url: e.target.value })} />
          </label>
          <label className="gp-field">
            <span>Pixel da Meta (mede a área: visita, cadeado aberto, início de checkout)</span>
            <input id="lk-pixel" inputMode="numeric" value={form.pixel_meta} onChange={(e) => setForm({ ...form, pixel_meta: e.target.value })} />
          </label>
        </div>
        <label className="gp-field">
          <span>Texto do banner (opcional)</span>
          <textarea id="lk-texto" value={form.texto_banner} onChange={(e) => setForm({ ...form, texto_banner: e.target.value })} />
        </label>
      </div>
      <div className="gp-box">
        <h3>Imagens da área</h3>
        <ImageField label="Logo" kind="logo" value={form.logo_url} onChange={(url) => setForm((f) => ({ ...f, logo_url: url }))} />
        <ImageField label="Capa da tela inicial: computador" kind="inicio" value={form.capa_inicio} onChange={(url) => setForm((f) => ({ ...f, capa_inicio: url }))} />
        <ImageField label="Capa da tela inicial: celular" kind="inicio-celular" value={form.capa_inicio_celular} onChange={(url) => setForm((f) => ({ ...f, capa_inicio_celular: url }))} />
        <small className="gp-fine">Sem capa própria, a tela inicial usa o banner do produto em destaque. Sem a versão de celular, usa a do computador.</small>
      </div>
      {error && <p className="gp-error">{error}</p>}
      <div className="gp-btns">
        <button type="submit" className="gp-btn gp-btn-gold">
          Salvar aparência
        </button>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ vendas

function Copy({ text, flash }: { text: string; flash: (t: string) => void }) {
  return (
    <div className="gp-copy">
      <div className="gp-code">{text}</div>
      <button
        type="button"
        className="gp-btn gp-btn-ghost gp-btn-sm"
        onClick={() =>
          navigator.clipboard
            .writeText(text)
            .then(() => flash("Copiado."))
            .catch(() => flash("Selecione e copie o texto."))
        }
      >
        Copiar
      </button>
    </div>
  );
}

// ------------------------------------------------------------------ grátis e avisos

type Lead = { email: string; name: string | null; whatsapp: string | null; utm: Record<string, string>; created_at: string; aviso_no_celular: boolean };
type SentNotice = { id: string; title: string; body: string | null; kind: string; push_sent: number; email_sent: number; starts_at: string | null; created_at: string };
const KIND_LABEL: Record<string, string> = { produto_novo: "Produto novo", modulo_novo: "Módulo novo", promo: "Promoção", ao_vivo: "Ao vivo", aviso: "Manual" };
const EMPTY_NOTICE = { titulo: "", texto: "", produto: "", link: "", botao: "", aoVivo: false, quando: "", email: true };

function FreeTab({ products, flash }: { products: Product[]; flash: (t: string) => void }) {
  const [leads, setLeads] = useState<{ total: number; celulares_com_aviso: number; alunos_com_email: number; email_ligado: boolean; cadastros: Lead[] } | null>(null);
  const [sent, setSent] = useState<SentNotice[]>([]);
  const [form, setForm] = useState(EMPTY_NOTICE);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [list, notices] = await Promise.all([op<typeof leads>("listar_cadastros_gratis", { limite: 1000 }), op<SentNotice[]>("listar_notificacoes")]);
    setLeads(list);
    setSent(notices);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca os dados do servidor
    void load();
  }, [load]);

  const base = `${window.location.host.startsWith("membros.") ? window.location.origin : "https://membros.bagencymidia.site"}${areaSlug() ? `/${areaSlug()}` : ""}`;
  const free = products.filter((product) => product.is_free);

  function csv() {
    const rows = [["data", "nome", "email", "whatsapp", "utm_source", "utm_campaign", "utm_content", "aviso_no_celular"]];
    for (const lead of leads?.cadastros || []) {
      rows.push([new Date(lead.created_at).toLocaleString("pt-BR"), lead.name || "", lead.email, lead.whatsapp || "", lead.utm.utm_source || "", lead.utm.utm_campaign || "", lead.utm.utm_content || "", lead.aviso_no_celular ? "sim" : "não"]);
    }
    const text = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\ufeff" + text], { type: "text/csv;charset=utf-8" }));
    link.download = `cadastros-gratis-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  }

  async function send() {
    setBusy(true);
    setError("");
    try {
      const result = await op<{ push_enviados: number; emails: { enviados: number; falhas: number; erro?: string } | null }>("enviar_notificacao", {
        titulo: form.titulo,
        texto: form.texto,
        produto: form.link ? "" : form.produto,
        link: form.link,
        botao: form.botao,
        ao_vivo: form.aoVivo,
        // datetime-local vem sem fuso: é horário de Brasília.
        quando: form.aoVivo && form.quando ? `${form.quando}:00-03:00` : "",
        email: form.email && Boolean(leads?.email_ligado),
        confirmar: true,
      });
      setForm(EMPTY_NOTICE);
      setConfirming(false);
      const mail = result.emails ? ` E-mails: ${result.emails.enviados} enviados${result.emails.falhas ? `, ${result.emails.falhas} falharam (${result.emails.erro || "erro"})` : ""}.` : "";
      flash(`Aviso enviado. ${result.push_enviados} celular(es) receberam.${mail}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="gp-panel">
      <div className="gp-box">
        <h3>Link do cadastro grátis</h3>
        <p className="gp-muted">Use nos anúncios, na bio e no WhatsApp. A pessoa coloca e-mail, WhatsApp e senha, entra na hora e cai direto na aula grátis.</p>
        <Copy text={`${base}/gratis`} flash={flash} />
        <small className="gp-fine">Para medir a origem, acrescente UTMs: {base}/gratis?utm_source=instagram&utm_campaign=bio</small>
        {free.length === 0 ? (
          <p className="gp-error">Nenhum produto está marcado como gratuito ainda. Em Produtos → Editar, marque &quot;Conteúdo gratuito&quot;.</p>
        ) : (
          <p className="gp-muted">Gratuito agora: {free.map((product) => product.title).join(", ")}.</p>
        )}
      </div>

      <InviteBox flash={flash} />

      <div className="gp-box">
        <h3>Mandar um aviso para todos</h3>
        <p className="gp-muted">Aparece no sino da área, chega no celular de quem ligou os avisos e, se marcar, no e-mail. Produto novo e módulo novo já avisam sozinhos.</p>
        <div className="gp-btns" role="radiogroup" aria-label="Tipo de aviso">
          <button type="button" role="radio" aria-checked={!form.aoVivo} className={`gp-btn gp-btn-sm ${form.aoVivo ? "gp-btn-ghost" : "gp-btn-gold"}`} onClick={() => setForm({ ...form, aoVivo: false })}>
            Aviso
          </button>
          <button type="button" role="radio" aria-checked={form.aoVivo} className={`gp-btn gp-btn-sm ${form.aoVivo ? "gp-btn-gold" : "gp-btn-ghost"}`} onClick={() => setForm({ ...form, aoVivo: true, botao: form.botao || "Entrar na live" })}>
            🔴 Ao vivo
          </button>
        </div>
        <div className="gp-grid2">
          <label className="gp-field">
            <span>Título</span>
            <input id="nt-titulo" maxLength={120} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder={form.aoVivo ? "Live: como escalar o seu produto" : "Aula nova liberada"} />
          </label>
          <label className="gp-field">
            <span>Ao tocar, abrir</span>
            <select id="nt-produto" value={form.produto} onChange={(e) => setForm({ ...form, produto: e.target.value })}>
              <option value="">Tela inicial</option>
              {products
                .filter((product) => product.published)
                .map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.title}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <label className="gp-field">
          <span>Texto (opcional)</span>
          <input id="nt-texto" maxLength={300} value={form.texto} onChange={(e) => setForm({ ...form, texto: e.target.value })} />
        </label>
        <div className="gp-grid2">
          <label className="gp-field">
            <span>Link {form.aoVivo ? "da live" : "(opcional: troca o \"Ao tocar, abrir\")"}</span>
            <input id="nt-link" type="url" inputMode="url" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value.trim() })} placeholder="https://youtube.com/live/..." />
          </label>
          <label className="gp-field">
            <span>Texto do botão</span>
            <input id="nt-botao" maxLength={40} value={form.botao} onChange={(e) => setForm({ ...form, botao: e.target.value })} placeholder={form.aoVivo ? "Entrar na live" : "Abrir"} />
          </label>
        </div>
        {form.aoVivo && (
          <label className="gp-field">
            <span>Dia e hora (horário de Brasília)</span>
            <input id="nt-quando" type="datetime-local" value={form.quando} onChange={(e) => setForm({ ...form, quando: e.target.value })} />
            <small className="gp-fine">Fica uma faixa vermelha no topo da área até 3 h depois do início.</small>
          </label>
        )}
        <label className="gp-check-field">
          <input type="checkbox" disabled={leads ? !leads.email_ligado : false} checked={form.email && (leads ? leads.email_ligado : true)} onChange={(e) => setForm({ ...form, email: e.target.checked })} />
          <span>
            {leads && !leads.email_ligado ? "E-mail dos avisos ainda não liberado nesta área (vai só no sino e no celular)" : `Mandar também por e-mail (${leads?.alunos_com_email ?? "…"} alunos)`}
          </span>
        </label>
        {error && <p className="gp-error">{error}</p>}
        <div className="gp-btns">
          {confirming ? (
            <>
              <button type="button" className="gp-btn gp-btn-gold" disabled={busy} onClick={() => void send()}>
                {busy ? "Enviando…" : `Confirmar: sino + ${leads?.celulares_com_aviso ?? 0} celulares${form.email && leads?.email_ligado ? ` + ${leads?.alunos_com_email ?? 0} e-mails` : ""}`}
              </button>
              <button type="button" className="gp-btn gp-btn-ghost" onClick={() => setConfirming(false)}>
                Cancelar
              </button>
            </>
          ) : (
            <button
              type="button"
              className="gp-btn gp-btn-gold"
              disabled={!form.titulo.trim() || (form.aoVivo && (!form.quando || !/^https:\/\//.test(form.link))) || (!!form.link && !/^https:\/\//.test(form.link))}
              onClick={() => setConfirming(true)}
            >
              Enviar aviso
            </button>
          )}
        </div>
        {sent.length > 0 && (
          <div className="gp-table-wrap">
            <table className="gp-table">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Aviso</th>
                  <th>Tipo</th>
                  <th>Celulares</th>
                  <th>E-mails</th>
                </tr>
              </thead>
              <tbody>
                {sent.map((notice) => (
                  <tr key={notice.id}>
                    <td>{new Date(notice.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td>
                    <td>{notice.title}</td>
                    <td>{KIND_LABEL[notice.kind] || "Manual"}</td>
                    <td className="n">{notice.push_sent}</td>
                    <td className="n">{notice.email_sent || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="gp-box">
        <div className="gp-module-head">
          <b>
            Cadastros grátis: {leads?.total ?? "…"} · com aviso no celular: {leads?.celulares_com_aviso ?? "…"}
          </b>
          <button type="button" className="gp-btn gp-btn-ghost gp-btn-sm" onClick={csv} disabled={!leads?.cadastros.length}>
            Baixar planilha
          </button>
        </div>
        {leads && leads.cadastros.length === 0 && <p className="gp-muted">Ninguém se cadastrou ainda.</p>}
        {leads && leads.cadastros.length > 0 && (
          <div className="gp-table-wrap">
            <table className="gp-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>E-mail</th>
                  <th>WhatsApp</th>
                  <th>Origem</th>
                  <th>Aviso</th>
                </tr>
              </thead>
              <tbody>
                {leads.cadastros.slice(0, 300).map((lead) => (
                  <tr key={lead.email}>
                    <td>{new Date(lead.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td>
                    <td>{lead.email}</td>
                    <td>{lead.whatsapp ? <a href={`https://wa.me/${lead.whatsapp}`} target="_blank" rel="noreferrer">{lead.whatsapp}</a> : "—"}</td>
                    <td>{[lead.utm.utm_source, lead.utm.utm_campaign].filter(Boolean).join(" / ") || "direto"}</td>
                    <td>{lead.aviso_no_celular ? "sim" : "não"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function InviteBox({ flash }: { flash: (t: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ convidados: string[]; ja_tinham_conta: number; falhas: string[]; restantes: number; total_compradores: number } | null>(null);
  const [error, setError] = useState("");

  async function send() {
    setBusy(true);
    setError("");
    try {
      const data = await op<NonNullable<typeof result>>("convidar_compradores", { confirmar: true });
      setResult(data);
      setConfirming(false);
      flash(`${data.convidados.length} convite(s) enviado(s).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gp-box">
      <h3>Convidar compradores que ainda não criaram a senha</h3>
      <p className="gp-muted">Manda o e-mail &quot;Sua área de membros chegou · Criar minha senha&quot; para quem tem produto liberado e ainda não tem conta. Quem já tem conta não recebe nada. Até 80 por vez.</p>
      {error && <p className="gp-error">{error}</p>}
      <div className="gp-btns">
        {confirming ? (
          <>
            <button type="button" className="gp-btn gp-btn-gold" disabled={busy} onClick={() => void send()}>
              {busy ? "Enviando… (pode levar 1 minuto)" : "Confirmar envio dos convites"}
            </button>
            <button type="button" className="gp-btn gp-btn-ghost" onClick={() => setConfirming(false)}>
              Cancelar
            </button>
          </>
        ) : (
          <button type="button" className="gp-btn gp-btn-gold" onClick={() => setConfirming(true)}>
            Enviar convites
          </button>
        )}
      </div>
      {result && (
        <p className="gp-ok">
          {result.convidados.length} convidados · {result.ja_tinham_conta} já tinham conta · {result.falhas.length} falhas
          {result.restantes ? ` · ${result.restantes} ficaram para a próxima rodada (daqui a 1 hora)` : ""}
          {result.falhas.length ? ` (falhou: ${result.falhas.join(", ")})` : ""}
        </p>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ promoção

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function PromoTab({ summary, products, reload, flash }: { summary: Summary; products: Product[]; reload: () => Promise<void>; flash: (t: string) => void }) {
  const look = summary.aparencia;
  const [form, setForm] = useState({
    ligada: Boolean(look.promo_enabled),
    titulo: look.promo_title || "Black Friday",
    texto: look.promo_text || "",
    termina_em: toLocalInput(look.promo_ends_at),
    cor: look.promo_color || "#22C55E",
    card_no_canto: look.promo_card !== false,
    avisos: look.promo_notify !== false,
  });
  const [rows, setRows] = useState(() =>
    Object.fromEntries(
      products.map((product) => [
        product.id,
        {
          on: Boolean(product.on_promo),
          preco: product.promo_price_cents ? String(product.promo_price_cents / 100).replace(".", ",") : "",
          checkout: product.promo_checkout_url || "",
        },
      ]),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmOn, setConfirmOn] = useState(false);
  const turningOn = form.ligada && !look.promo_enabled;
  const inPromo = products.filter((product) => rows[product.id]?.on);

  async function save() {
    setBusy(true);
    setError("");
    try {
      // 1) Produtos primeiro (sem aviso individual; o aviso geral sai ao ligar).
      for (const product of products) {
        const row = rows[product.id];
        const preco = row.preco ? Number(row.preco.replace(",", ".")) : null;
        if (row.on) {
          if (!product.price_cents) throw new Error(`${product.title}: cadastre o preço normal antes.`);
          if (!preco || preco * 100 >= product.price_cents) throw new Error(`${product.title}: o preço com desconto precisa ser menor que ${brl(product.price_cents)}.`);
        }
        const changed = row.on !== Boolean(product.on_promo) || (preco ? Math.round(preco * 100) : null) !== (product.promo_price_cents ?? null) || row.checkout !== (product.promo_checkout_url || "");
        if (changed) {
          await op("atualizar_produto", { produto: product.id, em_promocao: row.on, preco_promocional: preco ?? "", checkout_promocional: row.checkout, avisar: look.promo_enabled ? undefined : false });
        }
      }
      // 2) Configuração geral.
      const result = await op<{ promocao_no_ar: boolean; aviso_enviado: boolean }>("configurar_promocao", {
        ...form,
        termina_em: form.termina_em ? new Date(form.termina_em).toISOString() : "",
      });
      setConfirmOn(false);
      await reload();
      flash(result.promocao_no_ar ? `Promoção no ar${result.aviso_enviado ? " e aviso enviado" : ""}.` : "Promoção salva (desligada).");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="gp-panel">
      <div className="gp-box">
        <h3>Promoção (Black Friday e ofertas)</h3>
        <label className="gp-switch">
          <input id="pr-on" type="checkbox" checked={form.ligada} onChange={(e) => setForm({ ...form, ligada: e.target.checked })} />
          <span>
            Promoção ligada
            <small>Desligada, todos os produtos voltam ao preço normal na hora.</small>
          </span>
        </label>
        <label className="gp-switch">
          <input id="pr-card" type="checkbox" checked={form.card_no_canto} onChange={(e) => setForm({ ...form, card_no_canto: e.target.checked })} />
          <span>
            Card pequeno no canto da tela
            <small>Mostra os produtos em promoção, um de cada vez, com o preço riscado e o preço com desconto.</small>
          </span>
        </label>
        <label className="gp-switch">
          <input id="pr-avisos" type="checkbox" checked={form.avisos} onChange={(e) => setForm({ ...form, avisos: e.target.checked })} />
          <span>
            Avisos no sino e no celular
            <small>Um aviso para todos ao ligar a promoção e um quando você colocar mais um produto nela. Desligue para promoções discretas.</small>
          </span>
        </label>
        <div className="gp-grid2">
          <label className="gp-field">
            <span>Nome da promoção</span>
            <input id="pr-titulo" maxLength={40} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </label>
          <label className="gp-field">
            <span>Termina em (vazio = sem prazo; mostra contagem regressiva)</span>
            <input id="pr-fim" type="datetime-local" value={form.termina_em} onChange={(e) => setForm({ ...form, termina_em: e.target.value })} />
          </label>
          <label className="gp-field">
            <span>Frase curta do card</span>
            <input id="pr-texto" maxLength={120} value={form.texto} onChange={(e) => setForm({ ...form, texto: e.target.value })} placeholder="Só até domingo" />
          </label>
          <div className="gp-field">
            <span>Cor do preço com desconto</span>
            <div className="gp-color-row">
              <input type="color" aria-label="Cor do preço com desconto" value={/^#[0-9a-f]{6}$/i.test(form.cor) ? form.cor : "#22C55E"} onChange={(e) => setForm({ ...form, cor: e.target.value })} />
              <input type="text" aria-label="Cor do preço em código" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} />
            </div>
          </div>
        </div>
      </div>

      <div className="gp-box">
        <h3>Produtos na promoção ({inPromo.length})</h3>
        <p className="gp-muted">Marque, coloque o preço com desconto e o link do checkout que cobra esse preço. Sem o link, o aluno cai no checkout normal.</p>
        <div className="gp-list">
          {products
            .filter((product) => product.published)
            .map((product) => {
              const row = rows[product.id];
              const preco = row.preco ? Math.round(Number(row.preco.replace(",", ".")) * 100) : 0;
              const off = product.price_cents && preco ? Math.round((1 - preco / product.price_cents) * 100) : 0;
              const set = (patch: Partial<typeof row>) => setRows({ ...rows, [product.id]: { ...row, ...patch } });
              return (
                <div className="gp-promo-row" key={product.id}>
                  <input type="checkbox" aria-label={`${product.title} na promoção`} checked={row.on} onChange={(e) => set({ on: e.target.checked })} />
                  <div className="gp-promo-name">
                    <b>{product.title}</b>
                    <span className="gp-promo-price">
                      {product.price_cents ? <s>{brl(product.price_cents)}</s> : <span className="gp-error">sem preço normal</span>}
                      {preco > 0 && <b style={{ color: form.cor }}>{brl(preco)}{off > 0 ? ` (-${off}%)` : ""}</b>}
                    </span>
                  </div>
                  <input aria-label={`${product.title}: preço com desconto`} inputMode="decimal" value={row.preco} placeholder="Preço R$" onChange={(e) => set({ preco: e.target.value })} />
                  <input aria-label={`${product.title}: checkout com desconto`} value={row.checkout} placeholder="Link do checkout com desconto" onChange={(e) => set({ checkout: e.target.value })} />
                </div>
              );
            })}
        </div>
      </div>

      {error && <p className="gp-error">{error}</p>}
      <div className="gp-btns">
        {turningOn && form.avisos && !confirmOn ? (
          <button type="button" className="gp-btn gp-btn-gold" onClick={() => setConfirmOn(true)}>
            Salvar e ligar a promoção
          </button>
        ) : (
          <button type="button" className="gp-btn gp-btn-gold" disabled={busy} onClick={() => void save()}>
            {busy ? "Salvando…" : turningOn && form.avisos ? `Confirmar: ligar e avisar todos os alunos (${inPromo.length} produtos)` : "Salvar promoção"}
          </button>
        )}
        {confirmOn && (
          <button type="button" className="gp-btn gp-btn-ghost" onClick={() => setConfirmOn(false)}>
            Cancelar
          </button>
        )}
      </div>
    </section>
  );
}

function SalesTab({ summary, flash }: { summary: Summary | null; flash: (t: string) => void }) {
  const [urls, setUrls] = useState<{ hotmart: string; cakto: string; eduzz: string; generico: string; hotmart_hottok_salvo: boolean } | null>(null);
  const [hottok, setHottok] = useState("");

  const load = useCallback(async () => setUrls(await op("integracoes")), []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca os dados do servidor
    void load();
  }, [load]);

  return (
    <section className="gp-panel">
      <div className="gp-box">
        <h3>Funil dos últimos 30 dias</h3>
        <div className="gp-table-wrap">
          <table className="gp-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Cadeado aberto</th>
                <th>Checkout aberto</th>
                <th>Pagamento gerado</th>
                <th>Compras</th>
                <th>Alunos</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.produtos || []).map((row) => (
                <tr key={row.id}>
                  <td>{row.titulo}</td>
                  <td className="n">{row.funil_30d.cadeado_aberto}</td>
                  <td className="n">{row.funil_30d.checkout_aberto}</td>
                  <td className="n">{row.funil_30d.pagamento_gerado}</td>
                  <td className="n">{row.funil_30d.compras}</td>
                  <td className="n">{row.alunos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="gp-box">
        <h3>Eduzz</h3>
        <ol className="gp-steps">
          <li>
            No <b>Console da Eduzz (Developer Hub) → Webhooks</b>, crie uma configuração nova com a URL abaixo.
          </li>
          <li>
            Marque os eventos de fatura do MyEduzz: <b>paga</b>, <b>aguardando pagamento</b>, <b>reembolsada</b> e <b>chargeback</b>.
          </li>
          <li>
            Em cada produto daqui, preencha o link do checkout da Eduzz e o id <b>eduzz:ID_DO_PRODUTO</b>.
          </li>
        </ol>
        {urls && <Copy text={urls.eduzz} flash={flash} />}
        <p className="gp-fine">Este link tem a senha do webhook. Não compartilhe.</p>
      </div>

      <div className="gp-box">
        <h3>Hotmart</h3>
        <ol className="gp-steps">
          <li>
            Na Hotmart, abra <b>Ferramentas → Webhook (API e notificações)</b> e clique em <b>Cadastrar webhook</b>.
          </li>
          <li>
            Cole a URL abaixo, escolha a versão <b>2.0.0</b> e marque os eventos: compra aprovada, compra completa, reembolso, chargeback e boleto/Pix impresso.
          </li>
          <li>
            Copie o <b>hottok</b> que a Hotmart mostra e cole aqui embaixo. Sem ele, a área recusa as vendas.
          </li>
          <li>
            Em cada produto daqui, preencha o link do checkout e o id <b>hotmart:ID_DO_PRODUTO</b> (o número que aparece na Hotmart).
          </li>
        </ol>
        {urls && <Copy text={urls.hotmart} flash={flash} />}
        <div className="gp-copy">
          <input id="vd-hottok" className="gp-code" style={{ fontFamily: "inherit", fontSize: 15 }} value={hottok} onChange={(e) => setHottok(e.target.value)} placeholder={urls?.hotmart_hottok_salvo ? "Hottok já salvo (cole outro para trocar)" : "Cole o hottok da Hotmart"} />
          <button
            type="button"
            className="gp-btn gp-btn-gold gp-btn-sm"
            onClick={async () => {
              await op("salvar_hottok", { hottok });
              setHottok("");
              await load();
              flash("Hottok salvo.");
            }}
          >
            Salvar
          </button>
        </div>
        <span className={`gp-pill ${urls?.hotmart_hottok_salvo ? "on" : "warn"}`}>{urls?.hotmart_hottok_salvo ? "Hotmart conectada" : "Falta o hottok"}</span>
      </div>

      <div className="gp-box">
        <h3>Cakto e outras plataformas</h3>
        <p className="gp-muted" style={{ margin: 0 }}>
          Cadastre esta URL como webhook na Cakto (eventos de compra aprovada, reembolso, chargeback e Pix gerado). Para outra plataforma, troque “cakto” pelo nome dela.
        </p>
        {urls && <Copy text={urls.cakto} flash={flash} />}
        <p className="gp-fine">Este link tem a senha do webhook. Não compartilhe.</p>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ IA

function AiTab({ flash }: { flash: (t: string) => void }) {
  const [keys, setKeys] = useState<{ id: string; name: string; prefix: string; created_at: string; last_used_at: string | null; revoked_at: string | null }[]>([]);
  const [created, setCreated] = useState<{ key: string; url: string } | null>(null);
  const [name, setName] = useState(areaSlug() ? "Meu Claude" : "Claude do Brenno");
  const [tools, setTools] = useState<{ name: string; description: string }[]>([]);

  const load = useCallback(async () => {
    const [list, toolList] = await Promise.all([op<typeof keys>("chaves_listar"), op<typeof tools>("ferramentas")]);
    setKeys(list);
    setTools(toolList);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca os dados do servidor
    void load();
  }, [load]);

  return (
    <section className="gp-panel">
      <div className="gp-box">
        <h3>Conecte o Claude ou o ChatGPT a esta área</h3>
        <p className="gp-muted" style={{ margin: 0 }}>
          Depois de conectar, é só pedir em português: “cria o produto Curso X a R$ 97 com estes 5 vídeos do YouTube”, “oferece o produto Y no fim das aulas do X”, “muda a cor dos botões para verde”. A conexão só enxerga esta área.
        </p>
        <div className="gp-copy">
          <input id="ia-nome" className="gp-code" style={{ fontFamily: "inherit", fontSize: 15 }} value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome da conexão" />
          <button
            type="button"
            className="gp-btn gp-btn-gold gp-btn-sm"
            onClick={async () => {
              setCreated(await op("chave_criar", { nome: name }));
              await load();
            }}
          >
            Gerar link de conexão
          </button>
        </div>
        {created && (
          <div className="gp-box" style={{ background: "var(--gp-bg)" }}>
            <b>Link do conector (aparece só agora — copie e guarde):</b>
            <Copy text={created.url} flash={flash} />
            <ol className="gp-steps">
              <li>
                <b>Claude (site ou app):</b> Configurações → Conectores → Adicionar conector personalizado → cole o link.
              </li>
              <li>
                <b>ChatGPT:</b> Configurações → Apps e conectores → Avançado → ative o modo desenvolvedor → Criar → cole o link, autenticação “Nenhuma”.
              </li>
              <li>
                <b>Claude Code (terminal):</b>
                <Copy text={`claude mcp add --transport http genio-play ${created.url}`} flash={flash} />
              </li>
            </ol>
            <p className="gp-fine">Quem tiver este link consegue mexer na área. Se vazar, revogue abaixo e gere outro.</p>
          </div>
        )}
      </div>

      <div className="gp-box">
        <h3>Conexões</h3>
        {keys.length === 0 && <p className="gp-muted">Nenhuma ainda.</p>}
        <div className="gp-list">
          {keys.map((key) => (
            <div className="gp-item" key={key.id}>
              <div className="gp-item-main">
                <b>{key.name}</b>
                <small>
                  {key.prefix}… · criada em {new Date(key.created_at).toLocaleDateString("pt-BR")}
                  {key.last_used_at ? ` · último uso ${new Date(key.last_used_at).toLocaleString("pt-BR")}` : " · nunca usada"}
                </small>
              </div>
              {key.revoked_at ? (
                <span className="gp-pill">Revogada</span>
              ) : (
                <button
                  type="button"
                  className="gp-btn gp-btn-danger gp-btn-sm"
                  onClick={async () => {
                    await op("chave_revogar", { id: key.id });
                    await load();
                    flash("Conexão revogada.");
                  }}
                >
                  Revogar
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="gp-box">
        <h3>O que a IA consegue fazer</h3>
        <div className="gp-table-wrap">
          <table className="gp-table">
            <tbody>
              {tools.map((tool) => (
                <tr key={tool.name}>
                  <td>
                    <code>{tool.name}</code>
                  </td>
                  <td className="gp-muted">{tool.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="gp-fine">Apagar, liberar e bloquear acesso sempre pedem a sua confirmação na conversa antes.</p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- produtores (só na área principal, para quem administra a plataforma)

type AreaRow = { id: number; nome: string; slug: string; endereco: string; dono: string | null; email_avisos_ligado: boolean; produtos: number; alunos: number; criada_em: string };

function slugPreview(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function ProducersTab({ flash }: { flash: (t: string) => void }) {
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [form, setForm] = useState({ nome: "", slug: "", email: "", cor: "#F2B441" });
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ endereco_alunos: string; endereco_admin: string; convite: string } | null>(null);

  const load = useCallback(async () => setAreas(await op<AreaRow[]>("listar_areas")), []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca os dados do servidor
    void load();
  }, [load]);

  const slug = slugPreview(form.slug || form.nome);
  const valid = form.nome.trim().length >= 3 && slug.length >= 3 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim());

  async function create() {
    setBusy(true);
    setError("");
    try {
      const result = await op<{ endereco_alunos: string; endereco_admin: string; convite: string }>("criar_area", {
        nome: form.nome.trim(),
        slug,
        email_dono: form.email.trim().toLowerCase(),
        cor: form.cor,
        confirmar: true,
      });
      setDone(result);
      setForm({ nome: "", slug: "", email: "", cor: "#F2B441" });
      setConfirming(false);
      flash("Área criada.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a área.");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="gp-panel">
      <div className="gp-box">
        <h3>Nova área de produtor</h3>
        <p className="gp-muted">
          O produtor recebe um e-mail para criar a senha e cai direto no admin da área dele. Ele só enxerga os próprios produtos, alunos e vendas. E-mail de avisos começa desligado.
        </p>
        <div className="gp-grid2">
          <label className="gp-field">
            <span>Nome da área</span>
            <input id="pa-nome" maxLength={60} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Academia do Daniel" />
          </label>
          <label className="gp-field">
            <span>E-mail do produtor</span>
            <input id="pa-email" type="email" inputMode="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="produtor@email.com" />
          </label>
          <label className="gp-field">
            <span>Endereço (opcional)</span>
            <input id="pa-slug" maxLength={40} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder={slug || "sai do nome"} />
            <small className="gp-fine">membros.bagencymidia.site/{slug || "…"}</small>
          </label>
          <label className="gp-field">
            <span>Cor dos botões</span>
            <input id="pa-cor" type="color" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} />
          </label>
        </div>
        {error && <p className="gp-error">{error}</p>}
        <div className="gp-btns">
          {confirming ? (
            <>
              <button type="button" className="gp-btn gp-btn-gold" disabled={busy} onClick={() => void create()}>
                {busy ? "Criando…" : `Confirmar: criar /${slug} e convidar ${form.email.trim()}`}
              </button>
              <button type="button" className="gp-btn gp-btn-ghost" onClick={() => setConfirming(false)}>
                Cancelar
              </button>
            </>
          ) : (
            <button type="button" className="gp-btn gp-btn-gold" disabled={!valid} onClick={() => setConfirming(true)}>
              Criar área
            </button>
          )}
        </div>
        {done && (
          <div className="gp-box">
            <p>
              <b>Pronto.</b> Convite: {done.convite}.
            </p>
            <p className="gp-muted">Alunos: {done.endereco_alunos}</p>
            <Copy text={done.endereco_alunos} flash={flash} />
            <p className="gp-muted">Admin do produtor: {done.endereco_admin}</p>
            <Copy text={done.endereco_admin} flash={flash} />
          </div>
        )}
      </div>

      <div className="gp-box">
        <h3>Áreas</h3>
        <div className="gp-table-wrap">
          <table className="gp-table">
            <thead>
              <tr>
                <th>Área</th>
                <th>Endereço</th>
                <th>Dono</th>
                <th>Produtos</th>
                <th>Alunos</th>
                <th>E-mail avisos</th>
                <th>Acessar</th>
              </tr>
            </thead>
            <tbody>
              {areas.map((area) => (
                <tr key={area.id}>
                  <td>{area.nome}</td>
                  <td>
                    <a href={area.endereco} target="_blank" rel="noreferrer">
                      {area.endereco.replace("https://", "")}
                    </a>
                  </td>
                  <td>{area.dono || "—"}</td>
                  <td className="n">{area.produtos}</td>
                  <td className="n">{area.alunos}</td>
                  <td>{area.email_avisos_ligado ? "ligado" : "desligado"}</td>
                  <td>
                    {area.id !== 1 && (
                      <div className="gp-btns">
                        <a className="gp-btn gp-btn-gold gp-btn-sm" href={`${area.endereco}/admin`}>
                          Admin
                        </a>
                        <a className="gp-btn gp-btn-ghost gp-btn-sm" href={area.endereco} target="_blank" rel="noreferrer">
                          Ver área
                        </a>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
