"use client";

import { useCallback, useEffect, useState } from "react";
import Login from "../Login";
import { api, AuthError, brl, readSession } from "../session";

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
type Module = { id: string; title: string; release_days: number; lessons: Lesson[] };

type Summary = {
  aparencia: { brand_name: string; logo_url: string | null; accent: string; hero_product_id: string | null; hero_title: string | null; hero_text: string | null; support_url: string | null };
  alunos_unicos: number;
  produtos: { id: string; slug: string; titulo: string; publicado: boolean; preco: number | null; checkout: string; tem_checkout: boolean; aulas: number; alunos: number; funil_30d: Record<string, number> }[];
};

const op = <T,>(name: string, args: Record<string, unknown> = {}) => api<T>("/api/membros/admin", { body: { op: name, args } });

const TABS = [
  ["produtos", "Produtos"],
  ["conteudo", "Aulas"],
  ["aparencia", "Aparência"],
  ["vendas", "Vendas e integrações"],
  ["ia", "Conectar IA"],
] as const;
type Tab = (typeof TABS)[number][0];

export default function AdminPage() {
  const [logged, setLogged] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("produtos");
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const flash = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(""), 2600);
  }, []);

  const reload = useCallback(async () => {
    try {
      const [list, info] = await Promise.all([op<Product[]>("listar_produtos"), op<Summary>("resumo_area")]);
      setProducts(list);
      setSummary(info);
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
        <Login brand="Gênio Play · Configurar" onDone={() => setLogged(true)} />
      </div>
    );
  }

  const home = window.location.pathname.startsWith("/membros") ? "/membros" : "/";

  return (
    <div className="gp">
      <header className="gp-top gp-wrap">
        <a className="gp-logo" href={home}>
          <i />
          {summary?.aparencia.brand_name || "Gênio Play"}
        </a>
        <nav className="gp-nav">
          <a href={home}>Ver como aluno</a>
        </nav>
      </header>
      <main className="gp-wrap gp-admin">
        <div className="gp-tabs" role="tablist">
          {TABS.map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? "is-on" : ""} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>
        {error && <p className="gp-error">{error}</p>}
        {tab === "produtos" && <ProductsTab products={products} summary={summary} reload={reload} flash={flash} />}
        {tab === "conteudo" && <ContentTab products={products} flash={flash} />}
        {tab === "aparencia" && summary && <LookTab summary={summary} products={products} reload={reload} flash={flash} />}
        {tab === "vendas" && <SalesTab summary={summary} flash={flash} />}
        {tab === "ia" && <AiTab flash={flash} />}
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
      };
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
          <label className="gp-field">
            <span>Capa vertical 2:3 (link da imagem)</span>
            <input id="pf-capa" value={form.capa_url} onChange={set("capa_url")} placeholder="https://..." />
          </label>
          <label className="gp-field">
            <span>Banner horizontal 16:9 (link da imagem)</span>
            <input id="pf-banner" value={form.banner_url} onChange={set("banner_url")} placeholder="https://..." />
          </label>
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
        <label className="gp-check-field">
          <input id="pf-dest" type="checkbox" checked={form.destaque} onChange={set("destaque")} /> Pode aparecer no banner da tela inicial
        </label>
        <label className="gp-check-field">
          <input id="pf-painel" type="checkbox" checked={form.especial === "painel"} onChange={(e) => setForm({ ...form, especial: e.target.checked ? "painel" : "" })} /> Também libera o Painel Inteligente (Método Gênio)
        </label>
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
  });
  const [error, setError] = useState("");

  return (
    <form
      className="gp-panel"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
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
          <label className="gp-field">
            <span>Logo (link da imagem, opcional)</span>
            <input id="lk-logo" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
          </label>
          <label className="gp-field">
            <span>Cor de destaque</span>
            <input id="lk-cor" type="color" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} />
          </label>
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
        </div>
        <label className="gp-field">
          <span>Texto do banner (opcional)</span>
          <textarea id="lk-texto" value={form.texto_banner} onChange={(e) => setForm({ ...form, texto_banner: e.target.value })} />
        </label>
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
  const [name, setName] = useState("Claude do Brenno");
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
          Depois de conectar, é só pedir em português: “cria o produto Sono do Bebê a R$ 67 com estes 5 vídeos do YouTube”, “oferece o Pacote 27 no fim das aulas do Café Sem Pão”, “muda o banner para o Método Gênio”.
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
