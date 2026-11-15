
/* ============================================================
   CM MODAS — CATÁLOGO DE PRODUTOS
============================================================ */
(() => {
"use strict";

const ADMIN_PASSWORD = "92533911";
const WHATSAPP_NUMBER = "5521972755445";
const STORAGE_KEY = "cm_modas_catalog_v1";

const seed = [
 {id:1,gender:"masculino",name:"Camiseta Essential",category:"Camisetas",label:"Destaque",price:89.90,sizes:["P","M","G","GG"],description:"Camiseta de toque macio, caimento contemporâneo e acabamento minimalista.",likes:0,cost:0,stock:0,colors:[{name:"Branco",image:"https://images.pexels.com/photos/17858293/pexels-photo-17858293.jpeg?auto=compress&cs=tinysrgb&w=1200"},{name:"Preto",image:"https://images.pexels.com/photos/33056918/pexels-photo-33056918.jpeg?auto=compress&cs=tinysrgb&w=1200"}]},
 {id:2,gender:"masculino",name:"Camisa Urban",category:"Camisas",label:"Novo",price:159.90,sizes:["P","M","G","GG"],description:"Camisa de linhas limpas e visual refinado para diferentes ocasiões.",likes:0,cost:0,stock:0,colors:[{name:"Branca",image:"https://images.pexels.com/photos/5083017/pexels-photo-5083017.jpeg?auto=compress&cs=tinysrgb&w=1200"},{name:"Xadrez",image:"https://images.pexels.com/photos/17393361/pexels-photo-17393361.jpeg?auto=compress&cs=tinysrgb&w=1200"}]},
 {id:3,gender:"feminino",name:"Blusa Essential",category:"Blusas",label:"Destaque",price:99.90,sizes:["PP","P","M","G"],description:"Blusa de linhas essenciais e caimento elegante.",likes:0,cost:0,stock:0,colors:[{name:"Off-white",image:"https://images.pexels.com/photos/33502952/pexels-photo-33502952.jpeg?auto=compress&cs=tinysrgb&w=1200"},{name:"Preta",image:"https://images.pexels.com/photos/17738624/pexels-photo-17738624.jpeg?auto=compress&cs=tinysrgb&w=1200"}]},
 {id:4,gender:"feminino",name:"Vestido Noite",category:"Vestidos",label:"Especial",price:249.90,sizes:["PP","P","M","G"],description:"Vestido sofisticado para ocasiões especiais.",likes:0,cost:0,stock:0,colors:[{name:"Verde",image:"https://images.pexels.com/photos/19327681/pexels-photo-19327681.jpeg?auto=compress&cs=tinysrgb&w=1200"},{name:"Preto",image:"https://images.pexels.com/photos/13863505/pexels-photo-13863505.jpeg?auto=compress&cs=tinysrgb&w=1200"}]}
];

let products = [], gender = "masculino", admin = false, editingId = null, currentColors = [], adminListGender = "masculino";
const $ = s => document.querySelector(s);
const money = n => Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

function loadProducts(){
 try{
  const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
  if(Array.isArray(saved)){
   return saved.map(p=>{
    const sample=seed.find(s=>s.id===p.id&&s.name===p.name&&s.gender===p.gender);
    if(!sample||!Array.isArray(p.colors))return p;
    const oldMarker={1:"photo-1521572163474-6864f9cf17ab",2:"photo-1596755094514-f87e34085b2c",3:"photo-1551163943-3f6a855d1153",4:"photo-1566174053879-31528523f8ae"};
    const colors=p.colors.map((c,i)=>{
     if(String(c.image||"").includes(oldMarker[p.id])){
      const ref=sample.colors[i%sample.colors.length];
      return {...c,name:ref.name,image:ref.image};
     }
     return c;
    });
    return {...p,colors};
   });
  }
 }catch(e){}
 return seed.map(p=>({...p,colors:p.colors.map(c=>({...c}))}));
}

function persist(){
 try{
  localStorage.setItem(STORAGE_KEY,JSON.stringify(products));
 }catch(e){
  toast("Não foi possível salvar. Reduza o tamanho das fotos.");
 }
}

// CONEXÃO COM A API

async function fetchProducts() {
  const response = await fetch("/api/products", {
    method: "GET",
    headers: {
      "Accept": "application/json"
    },
    cache: "no-store"
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Erro da API:", data);
    throw new Error(data.detalhe || data.erro || "Erro ao buscar produtos.");
  }

  if (!Array.isArray(data)) {
    console.error("Resposta inesperada:", data);
    throw new Error("A API não retornou uma lista de produtos.");
  }

  return data;
}


async function initializeCatalog() {
  try {
    let remoteProducts = await fetchProducts();

    // Se o MongoDB estiver vazio, importa os produtos antigos
    if (remoteProducts.length === 0) {
      const oldProducts = loadProducts();

      for (const product of oldProducts) {
        const response = await fetch("/api/products", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(product)
        });

        if (!response.ok) {
          throw new Error("Erro ao importar produtos antigos.");
        }
      }

      // Busca novamente os produtos depois da importação
      remoteProducts = await fetchProducts();
    }

    // Atualiza a lista principal do catálogo
    products = remoteProducts;

    // Compartilha os produtos com o painel administrativo
    window.cmCatalogProducts = remoteProducts;
    window.cmProducts = remoteProducts;
    window.products = remoteProducts;

    // Atualiza a tela
    render();

    if (admin) {
      renderAdminList();
    }

    console.log(
      `Catálogo carregado do MongoDB! ${remoteProducts.length} produtos encontrados.`
    );

  } catch (error) {
    console.error("Erro ao inicializar catálogo:", error);

    toast("Erro ao carregar o catálogo. Verifique o servidor.");
  }
}

function toast(t){
 const el=$("#toast");
 el.textContent=t;
 el.classList.add("show");
 setTimeout(()=>el.classList.remove("show"),2300);
}

function safeText(v){
 return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

// ============================================================
// CM MODAS — MONITORAMENTO DO CATÁLOGO PÚBLICO
// ============================================================


const storeMovement = (() => {

  let sessionId = sessionStorage.getItem("cm_store_session");

  if (!sessionId) {
    sessionId = "cm_" +
      Date.now().toString(36) + "_" +
      Math.random().toString(36).slice(2, 12);

    sessionStorage.setItem("cm_store_session", sessionId);
  }

  let heartbeatTimer = null;
  let trackingActive = false;
  let lastHeartbeatAt = 0;

  function isAdminOpen() {
    const panel = document.querySelector("#adminBg");

    return (
      admin === true ||
      document.body.classList.contains("admin-mode") ||
      panel?.classList.contains("open") === true
    );
  }

  function sendHeartbeat(seconds = 0) {
    fetch("/api/store-movement/heartbeat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sessionId,
        source: "catalog",
        activeSeconds: seconds
      }),
      keepalive: true
    }).catch(error => {
      console.warn("Movimento da loja:", error);
    });
  }

  function heartbeat() {
    if (
      !trackingActive ||
      document.hidden ||
      isAdminOpen()
    ) {
      stop();
      return;
    }

    const agora = Date.now();

    const segundosAtivos = Math.min(
      45,
      Math.floor((agora - lastHeartbeatAt) / 1000)
    );

    lastHeartbeatAt = agora;

    sendHeartbeat(segundosAtivos);
  }

  function start() {
    if (
      trackingActive ||
      document.hidden ||
      isAdminOpen()
    ) return;

    trackingActive = true;
    lastHeartbeatAt = Date.now();

    // Registra o visitante imediatamente
    sendHeartbeat(0);

    // Atualiza o tempo a cada 10 segundos
    heartbeatTimer = setInterval(heartbeat, 10000);
  }

  function stop() {
    if (!trackingActive) return;

    // Salva o tempo restante antes de parar
    const agora = Date.now();

    const segundosAtivos = Math.min(
      45,
      Math.floor((agora - lastHeartbeatAt) / 1000)
    );

    trackingActive = false;
    lastHeartbeatAt = 0;

    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    if (segundosAtivos > 0) {
      sendHeartbeat(segundosAtivos);
    }
  }

  function checkAdmin() {
    if (isAdminOpen() || document.hidden) {
      stop();
    } else {
      start();
    }
  }

  const adminPanel = document.querySelector("#adminBg");

  if (adminPanel) {
    const observer = new MutationObserver(checkAdmin);

    observer.observe(adminPanel, {
      attributes: true,
      attributeFilter: ["class"]
    });
  }

  const bodyObserver = new MutationObserver(checkAdmin);

  bodyObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"]
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
    } else {
      checkAdmin();
    }
  });

  window.addEventListener("pagehide", stop);

  checkAdmin();

  function track(type, productId = null) {
    if (
      !trackingActive ||
      document.hidden ||
      isAdminOpen()
    ) return;

    fetch("/api/store-movement/event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sessionId,
        source: "catalog",
        type,
        productId
      }),
      keepalive: true
    }).catch(error => {
      console.warn("Erro ao registrar movimento:", error);
    });
  }

  return {
    start,
    stop,
    checkAdmin,
    track,
    trackEvent: track,
    getSessionId: () => sessionId
  };

})();


// NAVEGAÇÃO
const categoryGroups = {
 masculino: [
  "Destaques",
  "Camisas",
  "Bermudas",
  "Calças",
  "Conjuntos",
  "Calçados",
  "Acessórios"
 ],
 feminino: [
  "Destaques",
  "Vestidos",
  "Conjuntos",
  "Macacão",
  "Blusas",
  "Shorts",
  "Calças",
  "Roupas íntimas",
  "Calçados",
  "Acessórios"
 ]
};




let selectedCategory = "Destaques";

function renderCategoryTabs(){
 const root = $("#categoryTabs");
 if(!root) return;

 root.innerHTML = categoryGroups[gender].map(category => `
  <button type="button"
   class="category-tab ${category === selectedCategory ? "active" : ""}"
   data-category="${safeText(category)}">
   ${safeText(category)}
  </button>
 `).join("");

 root.querySelectorAll(".category-tab").forEach(button => {
  button.addEventListener("click", () => {
   selectedCategory = button.dataset.category;

   root.querySelectorAll(".category-tab").forEach(tab => {
    tab.classList.toggle(
     "active",
     tab.dataset.category === selectedCategory
    );
   });

   render();
  });
 });
}

function openGender(g){
 gender = g;
 selectedCategory = "Destaques";

 $("#genderScreen").style.display = "none";
 $("#catalog").classList.add("active");

 $("#catalogTitle").textContent =
  g === "masculino" ? "Coleção masculina" : "Coleção feminina";

 $("#search").value = "";

 document.querySelectorAll(".gender-tabs .gender-card").forEach(button => {
  button.classList.toggle("active", button.dataset.gender === g);
 });

 renderCategoryTabs();
 render();
}

function goHome(){
 openGender("masculino");
 window.scrollTo({top:0,behavior:"smooth"});
}



// EXIBIÇÃO DOS PRODUTOS


// ============================================================
// CARREGAMENTO DE FOTOS SOB DEMANDA
// ============================================================

const imageRequests = new Map();

async function loadProductImages(product) {
  if (!product) {
    throw new Error("Produto não encontrado.");
  }

  const existingColors = Array.isArray(product.colors)
    ? product.colors
    : [];

  // Só reutiliza se TODAS as fotos estiverem carregadas
  const allImagesLoaded =
    existingColors.length > 0 &&
    existingColors.every(color =>
      color &&
      typeof color.image === "string" &&
      color.image.trim() !== ""
    );

  if (allImagesLoaded) {
    return existingColors;
  }

  if (imageRequests.has(product.id)) {
    return imageRequests.get(product.id);
  }

  const request = (async () => {
    const response = await fetch(
      `/api/products/${product.id}/images`,
      { cache: "no-store" }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.erro || "Erro ao carregar fotografias."
      );
    }

    if (!Array.isArray(data.colors) || !data.colors.length) {
      throw new Error("Nenhuma foto foi retornada pelo banco.");
    }

    const loadedColors = data.colors.map((savedColor, index) => ({
      name: String(
        savedColor?.name ||
        existingColors[index]?.name ||
        "Cor"
      ),
      image: typeof savedColor?.image === "string"
        ? savedColor.image
        : ""
    }));

    const missingImage = loadedColors.some(
      color => !color.image.trim()
    );

    if (missingImage) {
      throw new Error("Uma ou mais fotos não foram carregadas.");
    }

    product.colors = loadedColors;

    return loadedColors;
  })();

  imageRequests.set(product.id, request);

  try {
    return await request;
  } catch (error) {
    imageRequests.delete(product.id);
    throw error;
  }
}

function render(){
 const list=$("#productList"),q=$("#search").value.trim().toLocaleLowerCase("pt-BR"),sort=$("#sort").value;

 let items=products
  .filter(p=>p.gender===gender)
  .filter(p=>{
   if(selectedCategory==="Destaques"){
    return String(p.label||"").toLocaleLowerCase("pt-BR").includes("destaque");
   }

   return normalizeCategory(p.category)===normalizeCategory(selectedCategory);
  })
  .filter(p=>(p.name+" "+p.category+" "+p.description).toLocaleLowerCase("pt-BR").includes(q));

 if(sort==="priceUp")items.sort((a,b)=>a.price-b.price);
 if(sort==="priceDown")items.sort((a,b)=>b.price-a.price);

 list.innerHTML="";

 if(!items.length){
  list.innerHTML='<div class="empty">Nenhuma peça encontrada nesta coleção.</div>';
  return;
 }

 items.forEach(p=>{
  const card=document.createElement("article");
  card.className="product";
  card.dataset.id=p.id;

  let colors = p.colors?.length
  ? p.colors
  : [{ name: "Principal", image: "" }];

let first = colors[0];

  card.innerHTML=`
   <div class="product-top">
    <div>
     <h3 class="product-title">${safeText(p.name)}</h3>
     <p class="product-desc">${safeText(p.description||"")}</p>
    </div>
    <span class="product-label">${safeText(p.label||"CM MODAS")}</span>
   </div>

   <div class="photo-row">
    <div class="photo-window photo-loading">
  <div class="photo-loader">
    <span class="photo-spinner"></span>
    <small>CARREGANDO FOTO</small>
  </div>
     <img class="main-photo" src="${safeText(first.image||"")}" alt="${safeText(p.name)}" loading="lazy">
     <span class="photo-ref-tag">FOTO DE REFERÊNCIA</span>
    <button class="photo-like-btn" type="button" aria-label="Curtir peça">
    <span class="like-heart-icon">♡</span>
    <small>Curtir</small>
</button>

  
<div class="photo-sizes">
  <small>TAMANHOS</small>
  ${(Array.isArray(p.sizes) ? p.sizes : []).map(size=>`
    <button type="button" class="size-option" data-size="${safeText(size)}">
      ${safeText(size)}
    </button>
  `).join("")}
</div>


     <div class="photo-overlay">
      <span class="current-color">${safeText(first.name)}</span>
      <button class="expand-btn">⛶ VER EM TELA CHEIA</button>
     </div>
    </div>
    <div class="color-rail">
 ${colors.map((c,i)=>`
  <button class="color-thumb color-thumb-loading ${i===0?"active":""}" data-index="${i}" aria-label="Ver cor ${safeText(c.name)}">
   <span class="color-thumb-loader">
    <span class="color-thumb-spinner"></span>
   </span>
   <img src="${safeText(c.image||"")}" alt="">
   <small>${safeText(c.name)}</small>
  </button>
 `).join("")}
</div>
   </div>

   <div class="product-bottom">
    <div class="price-row">
     <strong class="price">${money(p.price)}</strong>
     <span class="like-count">♥ <b>${Number(p.likes)||0}</b> curtidas</span>
    </div>

    <div class="actions">
     <a class="whatsapp-btn" target="_blank" rel="noopener">WHATSAPP&nbsp; ↗</a>
    </div>

    <button class="add-cart-btn" type="button">
     <span>＋</span> ADICIONAR AO CARRINHO
    </button>

    <button class="admin-edit">✎ EDITAR ESTA PEÇA</button>
   </div>
  `;

  const img=card.querySelector(".main-photo");
  const label=card.querySelector(".current-color");
  const thumbs=[...card.querySelectorAll(".color-thumb")];
  // LOADING INDIVIDUAL DAS MINIATURAS DE CORES
thumbs.forEach(button => {
  const thumbImage = button.querySelector("img");

  if (!thumbImage) return;

  const loaded = () => {
    button.classList.remove("color-thumb-loading");
  };

  const failed = () => {
    button.classList.remove("color-thumb-loading");
    button.classList.add("color-thumb-error");
  };

  thumbImage.addEventListener("load", loaded);
  thumbImage.addEventListener("error", failed);

  if (thumbImage.complete && thumbImage.naturalWidth > 0) {
    loaded();
  } else {
    button.classList.add("color-thumb-loading");
  }
});

const photoWindow = card.querySelector(".photo-window");

function setMainPhoto(src) {
  photoWindow.classList.add("photo-loading");
  img.classList.remove("photo-loaded");

  img.onload = () => {
    photoWindow.classList.remove("photo-loading");
    img.classList.add("photo-loaded");
  };

  img.onerror = () => {
    photoWindow.classList.remove("photo-loading");
    img.classList.remove("photo-loaded");
  };

  if (!src) {
    img.removeAttribute("src");
    photoWindow.classList.remove("photo-loading");
    return;
  }

  img.src = src;

  if (img.complete && img.naturalWidth > 0) {
    photoWindow.classList.remove("photo-loading");
    img.classList.add("photo-loaded");
  }
}

  let chosen=first;
let selectedSize="";
  const whatsapp=card.querySelector(".whatsapp-btn");

 

function updateWhatsapp(){
 const message =
  "Olá! Tenho interesse nesta peça da CM MODAS:\n\n"+
  "PEÇA: "+p.name+"\n"+
  "COR: "+chosen.name+"\n"+
  "TAMANHO: "+(selectedSize || "Ainda não selecionado")+"\n"+
  "Gostaria de saber as formas de pagamento e as opções de entrega para finalizar meu pedido. Desde já agradeço.";

 whatsapp.href="https://wa.me/"+WHATSAPP_NUMBER+"?text="+encodeURIComponent(message);
}

whatsapp.addEventListener("click", () => {
  storeMovement.trackEvent("whatsapp", p.id);
});

  async function selectColor(i) {
  try {
    colors = await loadProductImages(p);

    chosen = colors[i] || colors[0];

    setMainPhoto(chosen.image);
    label.textContent = chosen.name;

    thumbs.forEach((button, index) => {
      button.classList.toggle("active", index === i);

     const thumbImage = button.querySelector("img");
if (thumbImage) {
  button.classList.remove("color-thumb-error");

  if (colors[index]?.image) {
    button.classList.add("color-thumb-loading");
    thumbImage.src = colors[index].image;
  }
}
    });

    updateWhatsapp();

  } catch (error) {
    console.error("Erro ao carregar fotos:", error);
    toast("Não foi possível carregar as fotos desta peça.");
  }
}

  thumbs.forEach((b,i)=>b.addEventListener("click",()=>selectColor(i)));


// SELEÇÃO DO TAMANHO
const sizeButtons=[...card.querySelectorAll(".size-option")];

sizeButtons.forEach(button=>{
 button.addEventListener("click",()=>{
  selectedSize=button.dataset.size;

  sizeButtons.forEach(b=>{
   b.classList.toggle("selected",b===button);
  });

  updateWhatsapp();
 });
});
  card.querySelector(".expand-btn").addEventListener("click",()=>{
   $("#fullImage").src=chosen.image||"";
   $("#fullCaption").textContent=p.name+" · "+chosen.name;
   $("#fullModal").classList.add("open");
  });

 



// CURTIDAS: RESPOSTA IMEDIATA + SALVAMENTO NO MONGODB
const likeButton = card.querySelector(".photo-like-btn");

let likesPending = 0;
let likeQueue = Promise.resolve();

// Cria a animação do coração uma única vez
if (!document.getElementById("cm-like-animation-style")) {
  const style = document.createElement("style");
  style.id = "cm-like-animation-style";
  style.textContent = `
    .heart-float {
      position: fixed;
      z-index: 999999;
      pointer-events: none;
      color: #ed3155;
      font-size: 28px;
      animation: cmHeartFloat .9s ease-out forwards;
      transform: translate(-50%, -50%);
    }

    @keyframes cmHeartFloat {
      0% {
        opacity: 1;
        transform: translate(-50%, 0) scale(.7);
      }
      45% {
        opacity: 1;
        transform: translate(-50%, -45px) scale(1.25);
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -100px) scale(.9);
      }
    }

    .photo-like-btn {
      transition: transform .15s ease, color .15s ease;
      cursor: pointer;
    }

    .photo-like-btn:active {
      transform: scale(.88);
    }

    .photo-like-btn.liked .like-heart-icon {
      color: #ed3155;
    }
  `;
  document.head.appendChild(style);
}

likeButton.addEventListener("click", () => {
  storeMovement.track("like", p.id);

  // Atualização imediata, sem esperar o servidor
  p.likes = (Number(p.likes) || 0) + 1;
  likesPending++;

  card.querySelector(".like-count b").textContent = p.likes;
  likeButton.classList.add("liked");

  // Coração subindo
  const heart = document.createElement("span");
  heart.className = "heart-float";
  heart.textContent = "♥";

  const rect = likeButton.getBoundingClientRect();
  heart.style.left = (rect.left + rect.width / 2) + "px";
  heart.style.top = rect.top + "px";

  document.body.appendChild(heart);
  setTimeout(() => heart.remove(), 950);

  // Enfileira as requisições para evitar conflitos
  likeQueue = likeQueue.then(async () => {
    try {
      const response = await fetch(
        `/api/products/${p.id}/like`,
        { method: "POST" }
      );

      const data = await response.json();

      if (!response.ok || !data.sucesso) {
        throw new Error(data.erro || "Erro ao registrar curtida.");
      }

      likesPending--;

      // Só sincroniza quando todas as curtidas pendentes terminarem
      if (likesPending === 0) {
        p.likes = Number(data.likes) || 0;
        card.querySelector(".like-count b").textContent = p.likes;
      }

    } catch (error) {
      console.error("Erro ao salvar curtida:", error);

      // Desfaz somente a curtida que falhou
      likesPending--;
      p.likes = Math.max(0, (Number(p.likes) || 0) - 1);

      card.querySelector(".like-count b").textContent = p.likes;

      if (likesPending === 0) {
        likeButton.classList.remove("liked");
      }

      toast("Não foi possível salvar esta curtida. Tente novamente.");
    }
  });
});




  // ADICIONAR PEÇA AO CARRINHO COM A COR SELECIONADA
 card.querySelector(".add-cart-btn").addEventListener("click",()=>{

 addToCart(p,chosen,selectedSize || "Ainda não selecionado");

 const btn=card.querySelector(".add-cart-btn");
 btn.innerHTML="✓ ADICIONADO AO CARRINHO";
 btn.classList.add("added");

 setTimeout(()=>{
  btn.innerHTML="<span>＋</span> ADICIONAR AO CARRINHO";
  btn.classList.remove("added");
 },1200);
});

  updateWhatsapp();

  card.querySelector(".admin-edit").addEventListener("click",()=>{
   openAdmin();
   editProduct(p.id);
  });

  list.appendChild(card);

  // Carrega as fotos somente quando o produto se aproxima da tela
if (window.IntersectionObserver) {
  const observer = new IntersectionObserver(async entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;

      observer.unobserve(entry.target);

      try {
        colors = await loadProductImages(p);

        if (!card.isConnected) continue;

        first = colors[0] || { name: "Principal", image: "" };

        chosen = first;

        setMainPhoto(first.image);
        label.textContent = first.name;

        thumbs.forEach((button, index) => {
          const thumbImage = button.querySelector("img");

if (thumbImage) {
  button.classList.remove("color-thumb-error");

  if (colors[index]?.image) {
    button.classList.add("color-thumb-loading");
    thumbImage.src = colors[index].image;
  }
}
        });

        updateWhatsapp();

      } catch (error) {
        console.error("Erro ao carregar fotos do produto:", error);
      }
    }
  }, {
    rootMargin: "300px"
  });

  observer.observe(card);
} else {
  loadProductImages(p).then(loadedColors => {
    colors = loadedColors;
    first = colors[0] || first;
    chosen = first;
    setMainPhoto(first.image);
    label.textContent = first.name;
    updateWhatsapp();
  }).catch(console.error);
}

 });
}


// FOTO AMPLIADA
function openFullClose(){
 $("#fullModal").classList.remove("open");
}

$("#fullModal").addEventListener("click",e=>{
 if(e.target===$("#fullModal"))openFullClose();
});

$("#closeFull").onclick=openFullClose;

document.querySelectorAll(".gender-card").forEach(b=>{
 b.addEventListener("click",()=>openGender(b.dataset.gender));
});

$("#backHome").onclick=goHome;
$("#search").addEventListener("input",render);
$("#sort").addEventListener("change",render);

// PAINEL ADMINISTRATIVO
function openAdmin(){
 $("#adminBg").classList.add("open");
 if(admin){
  $("#adminLogin").hidden=true;
  $("#adminContent").hidden=false;
 }
}

$("#adminAccess").onclick=()=>{
 openAdmin();
 if(!admin)$("#adminPassword").focus();
};

$("#closeAdmin").onclick=()=>$("#adminBg").classList.remove("open");

$("#loginAdmin").onclick=()=>{
 if($("#adminPassword").value===ADMIN_PASSWORD){
  admin=true;
  document.body.classList.add("admin-mode");
  $("#adminLogin").hidden=true;
  $("#adminContent").hidden=false;
  $("#adminPassword").value="";
  renderAdminList();
  toast("Acesso autorizado.");
 }else{
  toast("Senha incorreta.");
 }
};

$("#adminPassword").addEventListener("keydown",e=>{
 if(e.key==="Enter")$("#loginAdmin").click();
});

$("#logoutAdmin").onclick=()=>{
 admin=false;
 document.body.classList.remove("admin-mode");
 $("#adminContent").hidden=true;
 $("#adminLogin").hidden=false;
 $("#adminBg").classList.remove("open");
 toast("Você saiu do painel.");
};

// FORMULÁRIO DE PRODUTOS
function clearForm() {
  editingId = null;

  currentColors = [{ name: "Preto", image: "" }];

  $("#pName").value = "";

  // Define a coleção padrão
  $("#pGender").value = gender || "masculino";

  // Carrega as categorias da coleção selecionada
  carregarCategoriasCadastro();

  // Deixa a primeira opção como seleção inicial
  $("#pCategory").selectedIndex = 0;

  $("#pPrice").value = "";
  $("#pCost").value = "";
  $("#pStock").value = "0";

  // Limpa a caixa de Destaques
  $("#pHighlight").checked = false;

  $("#pSizes").value = "P, M, G, GG";
  $("#pDescription").value = "";

  $("#deleteProduct").hidden = true;

  renderColorRows();
}

// CORES E FOTOS
function renderColorRows(){
 const root=$("#colorRows");
 root.innerHTML="";

 currentColors.forEach((c,i)=>{
  const row=document.createElement("div");
  row.className="color-line";

  row.innerHTML=`
   <input class="color-name" placeholder="Nome da cor" value="${safeText(c.name)}">
   <input class="color-url" placeholder="URL da foto (opcional)" value="${safeText(c.image?.startsWith("data:")?"":c.image||"")}">
   <button type="button" title="Remover cor">×</button>
   <label style="grid-column:1/-1;font-size:9px;color:#a49c8e">
    Ou enviar foto desta cor:
    <input class="color-file" type="file" accept="image/*" style="font-size:9px;margin-left:6px">
   </label>
   <img class="color-preview" src="${safeText(c.image||"")}" style="width:60px;height:70px;object-fit:cover;border-radius:6px;${c.image?"":"display:none"}">
  `;

  row.querySelector(".color-name").addEventListener("input",e=>{
   currentColors[i].name=e.target.value;
  });

  row.querySelector(".color-url").addEventListener("input",e=>{
   currentColors[i].image=e.target.value;
   const im=row.querySelector(".color-preview");
   im.src=e.target.value;
   im.style.display=e.target.value?"block":"none";
  });

  row.querySelector("button").onclick=()=>{
   currentColors.splice(i,1);
   renderColorRows();
  };

  row.querySelector(".color-file").addEventListener("change",e=>{
   const file=e.target.files[0];
   if(!file)return;

   if(file.size>1_500_000){
    toast("Escolha uma foto de até 1,5 MB.");
    e.target.value="";
    return;
   }

   const reader=new FileReader();
   reader.onload=()=>{
    currentColors[i].image=reader.result;
    renderColorRows();
   };
   reader.readAsDataURL(file);
  });

  root.appendChild(row);
 });
}

$("#addColor").onclick=()=>{
 currentColors.push({name:"Nova cor",image:""});
 renderColorRows();
};
// SALVAR, EDITAR E EXCLUIR

async function editProduct(id) {
  const p = products.find(x => x.id === id);

  if (!p) return;

  try {
    const loadedColors = await loadProductImages(p);

    if (
      !Array.isArray(loadedColors) ||
      !loadedColors.length ||
      loadedColors.some(c =>
        !c || typeof c.image !== "string" || !c.image.trim()
      )
    ) {
      throw new Error("As fotos das cores estão incompletas.");
    }

    currentColors = loadedColors.map(c => ({
      name: String(c.name || "Cor"),
      image: c.image
    }));

  } catch (error) {
    console.error("Erro ao carregar fotos para edição:", error);
    toast("Não foi possível carregar todas as fotos. Tente novamente.");
    return;
  }

  editingId = id;

  $("#pName").value = p.name || "";
  $("#pGender").value = p.gender || "masculino";

  carregarCategoriasCadastro();
  $("#pCategory").value = p.category || "";

  $("#pPrice").value = p.price || 0;
  $("#pCost").value = Number(p.cost) || 0;
  $("#pStock").value = Number(p.stock) || 0;

  $("#pHighlight").checked =
    (p.label || "").toLowerCase().includes("destaque");

  $("#pSizes").value = (p.sizes || []).join(", ");
  $("#pDescription").value = p.description || "";

  $("#deleteProduct").hidden = false;

  renderColorRows();

  $("#pName").scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}


$("#newProduct").onclick=()=>{
 clearForm();
 $("#pName").focus();
};

$("#cancelEdit").onclick=clearForm;

$("#saveProduct").onclick=async()=>{
 const name=$("#pName").value.trim();
 const price=Number($("#pPrice").value);

 if(!name){
  toast("Informe o nome da peça.");
  return;
 }

 if(!Number.isFinite(price)||price<0){
  toast("Informe um preço válido.");
  return;
 }

 const cleanColors=currentColors
  .map(c=>({
   name:c.name.trim()||"Cor",
   image:c.image.trim()
  }))
  .filter(c=>c.image);

 if(!cleanColors.length){
  toast("Adicione pelo menos uma foto de cor.");
  return;
 }

 const data={
  id:editingId||Date.now(),
  gender:$("#pGender").value,
  name,
  category:$("#pCategory").value,
  label:$("#pHighlight").checked ? "Destaque" : "",
  price,
  cost:Number($("#pCost").value)||0,
  stock:Math.max(0,Number($("#pStock").value)||0),
  sizes:$("#pSizes").value.split(",").map(s=>s.trim()).filter(Boolean),
  description:$("#pDescription").value.trim(),
  colors:cleanColors,
  likes:editingId
   ?(products.find(p=>p.id===editingId)?.likes||0)
   :0
 };

 try{
  const response=await fetch(
   editingId?`/api/products/${editingId}`:"/api/products",
   {
    method:editingId?"PUT":"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(data)
   }
  );

  const result=await response.json();

  if(!response.ok){
   throw new Error(result.erro||"Erro ao salvar.");
  }

  products=await fetchProducts();

  clearForm();
  renderAdminList();
  render();

  toast(editingId?"Peça atualizada no banco!":"Peça salva no banco!");
 }catch(error){
  console.error(error);
  toast("Não foi possível salvar no MongoDB.");
 }
};

$("#deleteProduct").onclick=async()=>{
 if(!editingId)return;
 if(!confirm("Tem certeza que deseja excluir esta peça?"))return;

 try{
  const response=await fetch(`/api/products/${editingId}`,{
   method:"DELETE"
  });

  if(!response.ok)throw new Error("Erro ao excluir.");

  products=await fetchProducts();

  clearForm();
  renderAdminList();
  render();

  toast("Peça excluída do banco!");
 }catch(error){
  console.error(error);
  toast("Erro ao excluir produto.");
 }
};

// LISTA ADMINISTRATIVA, IMPORTAÇÃO E EXPORTAÇÃO

function renderAdminList(genderToOpen = null){
  const root = $("#adminList");
  const modal = $("#adminProductsModal");

  const male = products.filter(p => p.gender === "masculino");
  const female = products.filter(p => p.gender === "feminino");

  $("#adminMaleCount").textContent = male.length;
  $("#adminFemaleCount").textContent = female.length;

  if(genderToOpen){
    adminListGender = genderToOpen;
    modal.hidden = false;
    modal.classList.add("open");
  }

  document.querySelectorAll("[data-admin-gender]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.adminGender === adminListGender
    );
  });

  if(!modal || modal.hidden) return;

  const isMale = adminListGender === "masculino";

  const list = products
    .filter(p => p.gender === adminListGender)
    .slice()
    .sort((a,b) => String(a.name).localeCompare(String(b.name), "pt-BR"));

  $("#adminProductsTitle").textContent = isMale
    ? "Coleção masculina"
    : "Coleção feminina";

  $("#adminProductsSubtitle").textContent = isMale
    ? "Gerencie as peças da coleção masculina."
    : "Gerencie as peças da coleção feminina.";

  $("#adminProductsCount").textContent =
    `${list.length} ${list.length === 1 ? "produto cadastrado" : "produtos cadastrados"}`;

  root.innerHTML = list.map(p => {
    const stock = Number(p.stock || 0);
    const stockClass = stock <= 0
      ? "stock-empty"
      : stock <= 5
        ? "stock-low"
        : "stock-ok";

    const stockLabel = stock <= 0
      ? "Sem estoque"
      : stock <= 5
        ? "Estoque baixo"
        : "Disponível";

    const photo = p.colors?.find(c => c.image)?.image || "";

    return `
      <article class="admin-product-row">
        <div class="admin-product-thumb">
          ${
            photo
              ? `<img src="${safeText(photo)}" alt="${safeText(p.name)}">`
              : `<span>CM</span>`
          }
        </div>

        <div class="admin-product-info">
          <strong>${safeText(p.name)}</strong>
          <small>${safeText(p.category || "Sem categoria")} · ${safeText(p.label || "Sem etiqueta")}</small>

          <div class="admin-product-meta">
            <strong>${money(p.price)}</strong>
            <span class="admin-stock-indicator ${stockClass}">
              <i></i>${stockLabel} · ${stock} un.
            </span>
          </div>
        </div>

        <button
          type="button"
          class="admin-product-edit"
          data-edit-admin-product="${safeText(String(p.id))}"
        >
          ✎ Editar
        </button>
      </article>
    `;
  }).join("") || `
    <div class="admin-products-empty">
      <span>▤</span>
      <strong>Nenhum produto nesta coleção</strong>
      <small>Adicione uma peça para ela aparecer aqui.</small>
    </div>
  `;

  root.querySelectorAll("[data-edit-admin-product]").forEach(button => {
    button.onclick = () => {
      const id = button.dataset.editAdminProduct;
      closeAdminProducts();

      const product = products.find(p => String(p.id) === String(id));
      if(!product) return;

      editProduct(product.id);
    };
  });
}

function openAdminProducts(gender){
  renderAdminList(gender);
}

function closeAdminProducts(){
  const modal = $("#adminProductsModal");
  modal.hidden = true;
  modal.classList.remove("open");
}

document.querySelectorAll("[data-admin-gender]").forEach(button => {
  button.addEventListener("click", () => {
    openAdminProducts(button.dataset.adminGender);
  });
});

$("#closeAdminProducts").onclick = closeAdminProducts;

$("#adminProductsModal").addEventListener("click", e => {
  if(e.target === $("#adminProductsModal")){
    closeAdminProducts();
  }
});


$("#exportData").onclick=()=>{
 const blob=new Blob([JSON.stringify(products,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");
 a.href=url;
 a.download="cm-modas-catalogo.json";
 a.click();
 URL.revokeObjectURL(url);
};

$("#importFile").onchange=e=>{
 const f=e.target.files[0];
 if(!f)return;

 const r=new FileReader();

 r.onload=()=>{
  try{
   const data=JSON.parse(r.result);
   if(!Array.isArray(data))throw Error();

   products=data;
   persist();
   renderAdminList();
   render();
   toast("Catálogo importado.");
  }catch{
   toast("Arquivo de catálogo inválido.");
  }
 };

 r.readAsText(f);
 e.target.value="";
};

$("#year").textContent = new Date().getFullYear();

// INICIALIZA AS ABAS DA COLEÇÃO MASCULINA
renderCategoryTabs();

// CARREGA OS PRODUTOS DO MONGODB
initializeCatalog();



// ========================================
// CARRINHO DE COMPRAS
// ========================================

let cart = [];


function addToCart(product, color, size){
 const existing = cart.find(item =>
  String(item.id) === String(product.id) &&
  item.color === color.name &&
  item.size === size
 );

 if(existing){
  existing.quantity++;
 }else{
  cart.push({
   id: product.id,
   name: product.name,
   price: Number(product.price) || 0,
   color: color.name,
   image: color.image,
   size: size,
   quantity: 1
  });
 }

 renderCart();
}


function renderCart(){
 const count = cart.reduce((total,item)=>total+item.quantity,0);
 const total = cart.reduce((sum,item)=>sum+(item.price*item.quantity),0);

 const counter = document.querySelector("#cartCount");
 const itemsContainer = document.querySelector("#cartItems");
 const totalElement = document.querySelector("#cartTotal");

 if(counter) counter.textContent = count;
 if(totalElement) totalElement.textContent = money(total);

 if(!itemsContainer) return;

 if(!cart.length){
  itemsContainer.innerHTML = `
   <div class="cart-empty">
    <span>🛍️</span>
    <strong>Seu carrinho está vazio</strong>
    <p>Adicione algumas peças para montar seu pedido.</p>
   </div>
  `;
  return;
 }

 itemsContainer.innerHTML = cart.map((item,index)=>`
  <article class="cart-item">

   <div class="cart-item-photo">
    <img
     src="${safeText(item.image || "")}"
     alt="${safeText(item.name)} - ${safeText(item.color)}"
    >
   </div>

   <div class="cart-item-info">
    <strong>${safeText(item.name)}</strong>
    <span>Cor: ${safeText(item.color)}</span>
    <span>Tamanho: ${safeText(item.size)}</span>
    <span>${money(item.price)} cada</span>
    <b>${money(item.price*item.quantity)}</b>
   </div>

   <div class="cart-item-controls">
    <button type="button" data-cart-action="minus" data-index="${index}">−</button>
    <strong>${item.quantity}</strong>
    <button type="button" data-cart-action="plus" data-index="${index}">＋</button>
    <button type="button" class="cart-remove" data-cart-action="remove" data-index="${index}">✕</button>
   </div>
  </article>
 `).join("");

 itemsContainer.querySelectorAll("[data-cart-action]").forEach(button=>{
  button.addEventListener("click",()=>{
   const index=Number(button.dataset.index);
   const action=button.dataset.cartAction;
   const item=cart[index];

   if(!item) return;

   if(action==="plus") item.quantity++;
   if(action==="minus") item.quantity--;
   if(action==="remove") item.quantity=0;

   if(item.quantity<=0) cart.splice(index,1);

   renderCart();
  });
 });
}

// ABRIR E FECHAR CARRINHO
function openCart(){
 renderCart();

 if (!admin) {
  storeMovement.trackEvent("cart");
 }

 document.querySelector("#cartModal")?.classList.add("open");
}

function closeCart(){
 document.querySelector("#cartModal")?.classList.remove("open");
}

// ENVIAR PEDIDO PELO WHATSAPP
function sendCartWhatsapp(){
 if(!cart.length){
  alert("Adicione pelo menos uma peça ao carrinho.");
  return;
 }

 const total=cart.reduce((sum,item)=>sum+(item.price*item.quantity),0);

 let message="Olá! Gostei destas peças e gostaria de saber mais sobre a compra:\n\n";
 message+="🛍️ *MEU PEDIDO — CM MODAS*\n\n";

 cart.forEach((item,index)=>{
  message+=`*${index+1}. ${item.name}*\n`;
  message+=`• Cor: ${item.color}\n`;
  message+=`• Tamanho: ${item.size}\n`;
  message+=`• Quantidade: ${item.quantity}\n`;
  message+=`• Valor unitário: ${money(item.price)}\n`;
  message+=`• Subtotal: ${money(item.price*item.quantity)}\n\n`;
 });

 message+=`*TOTAL DO PEDIDO: ${money(total)}*\n\n`;
 message+="Gostaria de saber as formas de pagamento e as opções de entrega para finalizar meu pedido. Desde já agradeço.";
 const url="https://wa.me/"+WHATSAPP_NUMBER+"?text="+encodeURIComponent(message);
 if (!admin) {
  storeMovement.trackEvent("whatsapp");
}

window.open(url,"_blank");
}

// EVENTOS DO CARRINHO
document.querySelector("#openCart")?.addEventListener("click",openCart);
document.querySelector("#closeCart")?.addEventListener("click",closeCart);
document.querySelector("#continueShopping")?.addEventListener("click",closeCart);
document.querySelector("#sendCartWhatsapp")?.addEventListener("click",sendCartWhatsapp);

document.querySelector("#cartModal")?.addEventListener("click",e=>{
 if(e.target.id==="cartModal") closeCart();
});

// MOVIMENTO: CLIQUES NO CARRINHO E WHATSAPP
document.querySelector("#openCart")?.addEventListener("click", () => {
  storeMovement.track("cart");
});

document.addEventListener("click", event => {
  const whatsappButton = event.target.closest(".whatsapp-btn");

  if (whatsappButton) {
    const productCard = whatsappButton.closest(".product");
    storeMovement.track("whatsapp", productCard?.dataset.id || null);
  }

  if (event.target.closest("#sendCartWhatsapp")) {
    storeMovement.track("whatsapp");
  }
});

})();


/* ============================================================
   CM MODAS — SISTEMA DE GESTÃO, VENDAS E FINANCEIRO
============================================================ */
(() => {
"use strict";

const STORE={
 clients:"cm_modas_clients_v1",
 sales:"cm_modas_sales_v1",
 installments:"cm_modas_installments_v1",
 stock:"cm_modas_stock_v1",
 cost:"cm_modas_cost_v1",
 movements:"cm_modas_movements_v1"
};





const $=s=>document.querySelector(s);

// RESET GERAL — PRESERVA O CATÁLOGO DE PRODUTOS
const resetSystemBtn = document.getElementById("resetSystemBtn");

if (resetSystemBtn) {
 resetSystemBtn.addEventListener("click", () => {

  const confirmar = confirm(
   "ATENÇÃO!\n\nSerão apagados:\n\n" +
   "• Clientes\n" +
   "• Vendas e históricos\n" +
   "• Parcelas e recebimentos\n" +
   "• Estoque local\n" +
   "• Custos locais\n" +
   "• Movimentações financeiras\n\n" +
   "Os produtos cadastrados no catálogo serão preservados.\n\n" +
   "Deseja continuar?"
  );

  if (!confirmar) return;

  const palavra = prompt("Digite RESETAR para confirmar:");

  if (palavra !== "RESETAR") {
   alert("Reset cancelado.");
   return;
  }

  Object.values(STORE).forEach(chave => {
   localStorage.removeItem(chave);
  });

  alert("Sistema resetado com sucesso! Seus produtos foram preservados.");

  window.location.reload();
 });
}

const money=n=>Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

const read=key=>{try{return JSON.parse(localStorage.getItem(key))||[]}catch{return []}};
const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));

let clients=read(STORE.clients),
    sales=read(STORE.sales),
    installments=read(STORE.installments),
    movements=read(STORE.movements);

    let movementPeriod = "today";

let stockMap=read(STORE.stock),
    costMap=read(STORE.cost),
    calendarDate=new Date(),
    selectedCalendarDay=null;

const todayISO=()=>{
 const d=new Date();
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const dateISO=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const parseDate=s=>new Date(`${s}T12:00:00`);

const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

const allProducts=()=>Array.isArray(window.cmProducts)?window.cmProducts:[];

function getProducts(){
 return Array.isArray(window.products)?window.products:[];
}

function getProductList(){
 return window.__cmProductsCache||[];
}

function localStock(p){
 return Number(stockMap[p.id]??p.stock??0);
}

function localCost(p){
 return Number(p.cost??costMap[p.id]??0);
}

function persistAll(){
 write(STORE.clients,clients);
 write(STORE.sales,sales);
 write(STORE.installments,installments);
 write(STORE.stock,stockMap);
 write(STORE.cost,costMap);
 write(STORE.movements,movements);
}

function getCatalog(){
 return window.cmCatalogProducts||[];
}

async function refreshCatalog(){
 try{
  const r=await fetch("/api/products");
  if(!r.ok)throw new Error("Erro ao atualizar produtos.");

  const list=await r.json();
  window.cmCatalogProducts=list;

  list.forEach(p=>{
   stockMap[p.id]=Number(p.stock)||0;
   costMap[p.id]=Number(p.cost)||0;
  });

  persistAll();
 }catch(e){
  console.error("Erro ao atualizar catálogo:",e);
 }
}


async function loadMovementStats() {
  const elements = {
    visits: document.querySelector("#movementVisits"),
    online: document.querySelector("#movementOnline"),
    average: document.querySelector("#movementAverage"),
    likes: document.querySelector("#movementLikes"),
    likesClicks: document.querySelector("#movementLikesClicks"),
    whatsapp: document.querySelector("#movementWhatsapp"),
    cart: document.querySelector("#movementCart"),
    totalTime: document.querySelector("#movementTotalTime"),
    updated: document.querySelector("#movementUpdated")
  };

  const setText = (element, value) => {
    if (element) element.textContent = value;
  };

  const number = (...values) => {
    const value = values.find(v => v !== undefined && v !== null);
    return Number(value) || 0;
  };

  
const formatTime = seconds => {
  seconds = Math.max(0, Math.floor(Number(seconds) || 0));

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const partes = [];

  if (hours > 0) {
    partes.push(`${hours} ${hours === 1 ? "hora" : "horas"}`);
  }

  if (minutes > 0) {
    partes.push(`${minutes} ${minutes === 1 ? "minuto" : "minutos"}`);
  }

  if (secs > 0 || partes.length === 0) {
    partes.push(`${secs} ${secs === 1 ? "segundo" : "segundos"}`);
  }

  return partes.join(" e ");
};

  try {
    setText(elements.updated, "Carregando dados...");

    const response = await fetch(
      `/api/store-movement/stats?period=${movementPeriod}`,
      {
        headers: {
          "x-admin-api-key": "92533911_"
        },
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status}`);
    }

    const data = await response.json();

    setText(elements.visits, number(data.visits, data.visitors, data.totalVisits));
    setText(elements.online, number(data.online, data.onlineNow));
    setText(elements.average, formatTime(
      number(data.averageSeconds, data.averageTime, data.averageDuration)
    ));
    setText(elements.likes, number(data.likes, data.totalLikes));
    setText(elements.likesClicks, number(data.likesClicks, data.likeClicks));
    setText(elements.whatsapp, number(data.whatsappClicks, data.whatsapp, data.whatsappCount));
    setText(elements.cart, number(data.cartClicks, data.cart, data.cartCount));
    setText(elements.totalTime, formatTime(
  number(data.activeSeconds, data.totalSeconds, data.totalTime, data.totalDuration)
));

    setText(elements.updated, "Atualizado às " +
      new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      })
    );

    drawMovementChart(data);

  } catch (error) {
    console.error("Erro ao carregar movimento da loja:", error);
    setText(elements.updated, "Não foi possível carregar os dados.");
  }
}

function drawMovementChart(data) {
  const canvas = document.querySelector("#movementChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const width = Math.max(rect.width, 280);
  const height = 260;
  const ratio = window.devicePixelRatio || 1;

  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.height = height + "px";

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const chartData =
    data.chart ||
    data.daily ||
    data.graph ||
    data.history ||
    data.series ||
    [];

  const items = Array.isArray(chartData) ? chartData : [];

  if (!items.length) {
    ctx.fillStyle = "#999";
    ctx.font = "13px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Sem dados para exibir neste período", width / 2, height / 2);
    return;
  }

  const values = items.map(item =>
    Number(
      item.visits ??
      item.visitors ??
      item.count ??
      item.total ??
      item.value ??
      0
    )
  );

  const maxValue = Math.max(...values, 1);
  const paddingLeft = 35;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 38;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const slotWidth = chartWidth / items.length;
  const barWidth = Math.min(28, slotWidth * 0.58);

  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= 4; i++) {
    const y = paddingTop + (chartHeight / 4) * i;

    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(width - paddingRight, y);
    ctx.stroke();
  }

  items.forEach((item, index) => {
    const value = values[index];
    const barHeight = (value / maxValue) * chartHeight;
    const x = paddingLeft + slotWidth * index + (slotWidth - barWidth) / 2;
    const y = paddingTop + chartHeight - barHeight;

    const gradient = ctx.createLinearGradient(0, y, 0, paddingTop + chartHeight);
    gradient.addColorStop(0, "#d6ad62");
    gradient.addColorStop(1, "#80521f");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, Math.max(barHeight, 2), 5);
    ctx.fill();

    const label = String(
      item.label ??
      item.date ??
      item.day ??
      item._id ??
      ""
    );

    ctx.fillStyle = "#aaa";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(label.slice(-5), x + barWidth / 2, height - 13);
  });
}

document.querySelectorAll(".movement-period").forEach(button => {
  button.addEventListener("click", () => {
    movementPeriod = button.dataset.period;

    document.querySelectorAll(".movement-period").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    loadMovementStats();
  });
});


function setPanel(id){
 document.querySelectorAll(".management-tab").forEach(b=>{
  b.classList.toggle("active",b.dataset.panel===id);
 });

 document.querySelectorAll(".management-panel").forEach(p=>{
  p.classList.toggle("active",p.id===id);
 });

 if(id==="dashboardPanel")renderDashboard();
 if(id==="clientsPanel")renderClients();
 if(id==="salesPanel")prepareSaleForm();
 if(id==="financePanel"){
  renderInstallments();
  renderCalendar();
}
 if(id==="productsPanel")renderStockOverview();
 if(id==="storeMovementPanel")loadMovementStats();
}

document.querySelectorAll(".management-tab").forEach(b=>{
 b.addEventListener("click",()=>setPanel(b.dataset.panel));
});


function dueStatus(item){
  if(item.paid) return "paid";

  // Saldo em aberto sem data de vencimento.
  if(!item.dueDate) return "pending";

  const diff = (
    parseDate(item.dueDate) - parseDate(todayISO())
  ) / 86400000;

  if(diff < 0) return "late";
  if(diff <= 5) return "soon";

  return "pending";
}


function statusLabel(status){
 return ({paid:"PAGA",late:"ATRASADA",soon:"VENCE EM BREVE",pending:"EM ABERTO"})[status];
}

function badge(status){
 return `<span class="status-pill status-${status}">${statusLabel(status)}</span>`;
}

function totalStockValue(){
 return getCatalog().reduce((sum,p)=>sum+localStock(p)*localCost(p),0);
}

function potentialProfit(){
 return getCatalog().reduce((sum,p)=>sum+localStock(p)*(Number(p.price||0)-localCost(p)),0);
}


function receivedTotal(){
  const salesReceived = sales.reduce((sum, sale) => {
    return sum + Number(sale.entry || 0);
  }, 0);

  const installmentReceived = installments.reduce((sum, item) => {
    return sum + Number(item.paidAmount || 0);
  }, 0);

  return salesReceived + installmentReceived;
}

function manualRevenueTotal(){
 return movements
  .filter(m=>m.type==="revenue")
  .reduce((sum,m)=>sum+Number(m.amount||0),0);
}

function manualExpenseTotal(){
 return movements
  .filter(m=>m.type==="expense")
  .reduce((sum,m)=>sum+Number(m.amount||0),0);
}

function addCashMovement(type){
 const label=type==="revenue"?"receita":"despesa";

 const description=prompt("Descrição da "+label+":");
 if(description===null)return;

 if(!description.trim()){
  toastMsg("Informe uma descrição.");
  return;
 }

 const raw=prompt("Qual o valor da "+label+"?");
 if(raw===null)return;

 const amount=Number(raw.trim().replace(/\./g,"").replace(",","."));

 if(!Number.isFinite(amount)||amount<=0){
  toastMsg("Informe um valor válido.");
  return;
 }

 movements.push({
  id:"mov_"+Date.now(),
  type,
  description:description.trim(),
  amount,
  date:todayISO()
 });

 persistAll();
 renderDashboard();

 toastMsg(type==="revenue"?"Receita adicionada ao caixa!":"Despesa adicionada ao caixa!");
}

function renderCashHistory(){
 const items=[];

 // RECEITAS E DESPESAS MANUAIS
 movements.forEach(m=>{
  items.push({
   type:m.type,
   description:m.description,
   amount:Number(m.amount||0),
   date:m.date
  });
 });

 // ENTRADAS DAS VENDAS
 sales.forEach(s=>{
  const amount=Number(s.entry||0);

  if(amount>0){
   items.push({
    type:"revenue",
    description:"Entrada da venda · "+(s.clientName||"Cliente")+" · "+(s.productName||"Produto"),
    amount,
    date:s.date
   });
  }
 });

 // PAGAMENTOS DE PARCELAS RECEBIDOS
 installments.forEach(i=>{
  const amount=Number(i.paidAmount||0);

  if(amount>0){
   items.push({
    type:"revenue",
    description:"Pagamento de parcela · "+(i.clientName||"Cliente")+" · "+(i.productName||"Produto"),
    amount,
    date:i.paidAt||null
   });
  }
 });

 items.sort((a,b)=>{
  if(!a.date)return 1;
  if(!b.date)return -1;
  return String(b.date).localeCompare(String(a.date));
 });

 const income=items
  .filter(i=>i.type!=="expense")
  .reduce((sum,i)=>sum+i.amount,0);

 const expenses=items
  .filter(i=>i.type==="expense")
  .reduce((sum,i)=>sum+i.amount,0);

 $("#historyIncome").textContent=money(income);
 $("#historyExpenses").textContent=money(expenses);

 $("#cashHistoryList").innerHTML=items.map(i=>{
  const expense=i.type==="expense";

  const date=i.date
   ?new Date(i.date+(String(i.date).length===10?"T12:00:00":"")).toLocaleDateString("pt-BR")
   :"Data não registrada";

  return `
   <div class="cash-history-item">
    <div class="cash-history-info">
     <strong>${esc(i.description)}</strong>
     <small>${date} · ${expense?"Despesa":"Entrada"}</small>
    </div>
    <span class="cash-history-value ${expense?"expense":"income"}">
     ${expense?"− ":"+ "}${money(i.amount)}
    </span>
   </div>
  `;
 }).join("")||`
  <div class="cash-history-empty">
   Nenhuma movimentação registrada ainda.
  </div>
 `;

 $("#cashHistoryModal").classList.add("open");
}

// CALCULA O LUCRO SOMENTE APÓS RECUPERAR O CUSTO
function calculateSaleProfit(sale){
 const received=Number(sale.entry||0)+
  installments
   .filter(i=>i.saleId===sale.id)
   .reduce((sum,i)=>sum+Number(i.paidAmount||0),0);

 const costTotal=sale.costTotal!==undefined
  ?Number(sale.costTotal)
  :Math.max(0,Number(sale.total||0)-Number(sale.profit||0));

 const total=Number(sale.total||0);
 const profitLimit=Math.max(0,total-costTotal);

 return Math.min(profitLimit,Math.max(0,received-costTotal));
}

function renderDashboard(){
 const catalog=getCatalog();

 // TOTAL DE UNIDADES DISPONÍVEIS
 const totalUnits=catalog.reduce((sum,p)=>sum+localStock(p),0);

 // FATURAMENTO TOTAL — SOMENTE VALORES RECEBIDOS
 const revenue=receivedTotal();

 // LUCRO DAS VENDAS REALIZADAS
 const profit=sales.reduce((sum,v)=>sum+calculateSaleProfit(v),0);

 // VALOR DE CUSTO DO ESTOQUE
 const investment=catalog.reduce((sum,p)=>sum+localStock(p)*localCost(p),0);

 // LUCRO PREVISTO DO ESTOQUE
 const stockProfit=catalog.reduce((sum,p)=>sum+localStock(p)*(Number(p.price||0)-localCost(p)),0);

 // FATURAMENTO POTENCIAL DO ESTOQUE
 const stockRevenue=catalog.reduce((sum,p)=>sum+localStock(p)*Number(p.price||0),0);

 // SALDO DO CAIXA
 const cash=receivedTotal()+manualRevenueTotal()-manualExpenseTotal();

 // PARCELAS PENDENTES
 const pending=installments
  .filter(i=>!i.paid)
  .reduce((sum,i)=>sum+Math.max(0,Number(i.amount)-Number(i.paidAmount||0)),0);

 // ATUALIZA OS INDICADORES
 $("#mCash").textContent=money(cash);

 $("#mSalesCount").textContent=sales.length+(sales.length===1?" venda":" vendas");

 $("#mRevenue").textContent=money(revenue);
 $("#mProfit").textContent=money(profit);
 $("#mInvestment").textContent=money(investment);

 $("#mStockUnits").textContent=totalUnits+(totalUnits===1?" unidade disponível":" unidades disponíveis");

 $("#mStockProfit").textContent=money(stockProfit);
 $("#mStockRevenue").textContent=money(stockRevenue);
 $("#mProducts").textContent=catalog.length;
 $("#mClients").textContent=clients.length;
 $("#mPending").textContent=money(pending);

 $("#mPendingCount").textContent=installments.filter(i=>!i.paid).length+" parcelas em aberto";

 // VENDAS RECENTES
 $("#recentSales").innerHTML=sales
  .slice()
  .reverse()
  .slice(0,5)
  .map(v=>`
   <div class="compact-row">
    <span>
     ${esc(v.clientName)}
     <small>${new Date(v.date).toLocaleDateString("pt-BR")}</small>
    </span>
    <strong>${money(v.total)}</strong>
   </div>
  `).join("")||'<div class="empty">Nenhuma venda registrada.</div>';

 // ESTOQUE BAIXO
 $("#lowStockList").innerHTML=catalog
  .filter(p=>localStock(p)<=5)
  .map(p=>`
   <div class="compact-row">
    <span>
     ${esc(p.name)}
     <small>${esc(p.gender||"")}</small>
    </span>
    <strong>${localStock(p)} un.</strong>
   </div>
  `).join("")||'<div class="empty">Nenhum produto com estoque baixo.</div>';

 // GRÁFICO DOS ÚLTIMOS 7 DIAS
 const days=[];

 for(let i=6;i>=0;i--){
  const d=new Date();
  d.setDate(d.getDate()-i);

  const key=dateISO(d);

  const value=sales
   .filter(v=>dateISO(new Date(v.date))===key)
   .reduce((sum,v)=>sum+Number(v.total||0),0);

  days.push({
   key,
   label:d.toLocaleDateString("pt-BR",{weekday:"short"}).replace(".",""),
   value
  });
 }

 const max=Math.max(1,...days.map(d=>d.value));

 $("#revenueChart").innerHTML=days.map(d=>`
  <div class="chart-column">
   <b>${d.value?money(d.value):"—"}</b>
   <div class="chart-bar-wrap">
    <div class="chart-bar" style="height:${Math.max(2,d.value/max*100)}%"></div>
   </div>
   <small>${d.label}</small>
  </div>
 `).join("");
}

// CLIENTES
function clearClient(){
 $("#clientId").value="";
 $("#clientName").value="";
 $("#clientPhone").value="";
 $("#clientNotes").value="";
}

$("#clientForm").addEventListener("submit",e=>{
 e.preventDefault();

 const id=$("#clientId").value||("c"+Date.now());

 const item={
  id,
  name:$("#clientName").value.trim(),
  phone:$("#clientPhone").value.trim(),
  notes:$("#clientNotes").value.trim()
 };

 if(!item.name||!item.phone)return;

 const idx=clients.findIndex(c=>c.id===id);

 if(idx>=0)clients[idx]=item;
 else clients.push(item);

 persistAll();
 clearClient();
 renderClients();
 toastMsg("Cliente salvo.");
});

$("#clearClientForm").onclick=clearClient;
$("#clientSearch").addEventListener("input",renderClients);

function renderClients(){
 const q=($("#clientSearch").value||"").toLocaleLowerCase("pt-BR");

 $("#clientsList").innerHTML=clients
  .filter(c=>(c.name+" "+c.phone).toLocaleLowerCase("pt-BR").includes(q))
  .map(c=>{
   const count=sales.filter(s=>s.clientId===c.id).length;

   return `
    <div class="data-row">
     <div class="data-row-main">
      <strong>${esc(c.name)}</strong>
      <small>${esc(c.phone)} · ${count} compra(s)</small>
     </div>
     <div class="data-row-actions">
      <button data-history="${c.id}">HISTÓRICO</button>
      <button data-edit-client="${c.id}">EDITAR</button>
      <button class="danger" data-delete-client="${c.id}">EXCLUIR</button>
     </div>
    </div>
   `;
  }).join("")||'<div class="empty">Nenhum cliente cadastrado.</div>';

 $("#clientsList").querySelectorAll("[data-edit-client]").forEach(b=>{
  b.onclick=()=>{
   const c=clients.find(x=>x.id===b.dataset.editClient);
   if(!c)return;

   $("#clientId").value=c.id;
   $("#clientName").value=c.name;
   $("#clientPhone").value=c.phone;
   $("#clientNotes").value=c.notes||"";
   $("#clientName").focus();
  };
 });

 $("#clientsList").querySelectorAll("[data-delete-client]").forEach(b=>{
  b.onclick=()=>{
   if(!confirm("Excluir este cliente? O histórico de vendas será preservado."))return;

   clients=clients.filter(c=>c.id!==b.dataset.deleteClient);
   persistAll();
   renderClients();
  };
 });

 $("#clientsList").querySelectorAll("[data-history]").forEach(b=>{
  b.onclick=()=>renderClientHistory(b.dataset.history);
 });

 populateClientSelect();
}


function renderClientHistory(id, expandedSaleId = null){
  const c = clients.find(x => String(x.id) === String(id));
  if(!c) return;

  const root = $("#clientHistory");
  if(!root) return;

  const items = sales
    .filter(s => String(s.clientId) === String(id))
    .slice()
    .sort((a,b) => new Date(b.date) - new Date(a.date));

  const dateFormat = value => {
    if(!value) return "Data não registrada";

    const date = new Date(
      String(value).length === 10 ? value + "T12:00:00" : value
    );

    return Number.isNaN(date.getTime())
      ? "Data não registrada"
      : date.toLocaleDateString("pt-BR");
  };

  const paymentDate = value => {
    if(!value) return "Data não registrada";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? "Data não registrada"
      : date.toLocaleString("pt-BR");
  };

  const saleReceived = sale => {
    return Number(sale.entry || 0) +
      installments
        .filter(i => String(i.saleId) === String(sale.id))
        .reduce((sum,i) => sum + Number(i.paidAmount || 0), 0);
  };

  const saleBalance = sale => {
    return Math.max(0, Number(sale.total || 0) - saleReceived(sale));
  };

  const saleInstallments = sale => {
    return installments
      .filter(i => String(i.saleId) === String(sale.id))
      .sort((a,b) => {
        if(!a.dueDate) return 1;
        if(!b.dueDate) return -1;
        return String(a.dueDate).localeCompare(String(b.dueDate));
      });
  };

  root.hidden = false;
  root.classList.add("client-history-overlay");

  root.innerHTML = `
    <div class="client-history-modal" role="dialog" aria-modal="true"
         aria-label="Histórico do cliente">

      <div class="client-history-header">
        <div>
          <span class="client-history-kicker">RELACIONAMENTO CM MODAS</span>
          <h3>Histórico do cliente</h3>
          <p>${esc(c.name)} · ${esc(c.phone || "")}</p>
        </div>

        <button type="button" class="client-history-close"
                data-close-client-history aria-label="Fechar">×</button>
      </div>

      <div class="client-history-summary">
        <div>
          <small>TOTAL DE COMPRAS</small>
          <strong>${items.length}</strong>
        </div>
        <div>
          <small>TOTAL COMPRADO</small>
          <strong>${money(items.reduce((sum,s) => sum + Number(s.total || 0),0))}</strong>
        </div>
        <div>
          <small>SALDO EM ABERTO</small>
          <strong>${money(items.reduce((sum,s) => sum + saleBalance(s),0))}</strong>
        </div>
      </div>

      <div class="client-history-content">
        ${
          items.length
          ? items.map(s => {
              const received = saleReceived(s);
              const balance = saleBalance(s);
              const parts = saleInstallments(s);
              const expanded = String(expandedSaleId) === String(s.id);

              const products = (s.items || [])
                .map(i => `${esc(i.productName)} (${Number(i.qty || 0)} un.)`)
                .join(", ") || esc(s.productName || "Produto");

              const status = balance <= 0.009
                ? "QUITADA"
                : received > 0
                  ? "PAGAMENTO PARCIAL"
                  : "AGUARDANDO PAGAMENTO";

              return `
                <article class="client-sale-card">
                  <div class="client-sale-top">
                    <div>
                      <span class="client-sale-date">${dateFormat(s.date)}</span>
                      <h4>${products}</h4>
                      <small>Venda ${esc(String(s.id))}</small>
                    </div>

                    <span class="client-sale-status ${balance <= 0.009 ? "is-paid" : "is-open"}">
                      ${status}
                    </span>
                  </div>

                  <div class="client-sale-values">
                    <div>
                      <small>VALOR DA VENDA</small>
                      <strong>${money(s.total)}</strong>
                    </div>
                    <div>
                      <small>RECEBIDO</small>
                      <strong>${money(received)}</strong>
                    </div>
                    <div>
                      <small>EM ABERTO</small>
                      <strong class="${balance > 0.009 ? "client-value-pending" : ""}">
                        ${money(balance)}
                      </strong>
                    </div>
                  </div>

                  <button type="button"
                    class="client-sale-details-btn"
                    data-client-sale-details="${esc(String(s.id))}">
                    ${expanded ? "OCULTAR DETALHES" : "VER HISTÓRICO DESTA VENDA"}
                    <span>${expanded ? "−" : "+"}</span>
                  </button>

                  ${
                    expanded
                    ? `
                      <div class="client-sale-details">

                        <div class="client-sale-section-title">
                          <strong>Resumo financeiro</strong>
                          <span>${parts.length} parcela(s)</span>
                        </div>

                        <div class="client-sale-finance-row">
                          <span>Subtotal</span>
                          <strong>${money(s.subtotal ?? s.total)}</strong>
                        </div>

                        <div class="client-sale-finance-row">
                          <span>Desconto</span>
                          <strong>${money(s.discount || 0)}</strong>
                        </div>

                        <div class="client-sale-finance-row">
                          <span>Entrada recebida</span>
                          <strong>${money(s.entry || 0)}</strong>
                        </div>

                        <div class="client-sale-finance-row total">
                          <span>Saldo restante</span>
                          <strong>${money(balance)}</strong>
                        </div>

                        ${
                          Number(s.entry || 0) > 0
                          ? `
                            <div class="client-payment-history">
                              <strong>Entrada da venda</strong>
                              ${
                                (Array.isArray(s.payments) && s.payments.length)
                                ? s.payments.map(p => `
                                    <div class="client-payment-row">
                                      <span>${esc(p.description || "Entrada da venda")}</span>
                                      <small>${paymentDate(p.date)}</small>
                                      <strong>${money(p.amount)}</strong>
                                    </div>
                                  `).join("")
                                : `
                                  <div class="client-payment-row">
                                    <span>Entrada registrada</span>
                                    <small>${dateFormat(s.date)}</small>
                                    <strong>${money(s.entry)}</strong>
                                  </div>
                                `
                              }
                            </div>
                          `
                          : ""
                        }

                        <div class="client-sale-section-title client-installments-heading">
                          <strong>Parcelas e recebimentos</strong>
                        </div>

                        ${
                          parts.length
                          ? parts.map((part,index) => {
                              const partBalance = Math.max(
                                0,
                                Number(part.amount || 0) - Number(part.paidAmount || 0)
                              );

                              const partPaid = partBalance <= 0.009;
                              const partPayments = Array.isArray(part.payments)
                                ? part.payments
                                : [];

                              const partStatus = partPaid
                                ? "PAGA"
                                : dueStatus(part) === "late"
                                  ? "ATRASADA"
                                  : part.paidAmount > 0
                                    ? "PARCIAL"
                                    : "EM ABERTO";

                              return `
                                <div class="client-installment-card">
                                  <div class="client-installment-top">
                                    <strong>Parcela ${index + 1}</strong>
                                    <span class="client-installment-status ${partPaid ? "is-paid" : "is-open"}">
                                      ${partStatus}
                                    </span>
                                  </div>

                                  <div class="client-installment-grid">
                                    <div>
                                      <small>VENCIMENTO</small>
                                      <strong>${part.dueDate ? dateFormat(part.dueDate) : "Sem vencimento"}</strong>
                                    </div>
                                    <div>
                                      <small>VALOR</small>
                                      <strong>${money(part.amount)}</strong>
                                    </div>
                                    <div>
                                      <small>RECEBIDO</small>
                                      <strong>${money(part.paidAmount || 0)}</strong>
                                    </div>
                                    <div>
                                      <small>SALDO</small>
                                      <strong class="${partBalance > 0.009 ? "client-value-pending" : ""}">
                                        ${money(partBalance)}
                                      </strong>
                                    </div>
                                  </div>

                                  ${
                                    partPayments.length
                                    ? `
                                      <div class="client-payment-history">
                                        <strong>Pagamentos realizados</strong>
                                        ${partPayments.map(p => `
                                          <div class="client-payment-row">
                                            <span>Recebimento</span>
                                            <small>${paymentDate(p.date)}</small>
                                            <strong>${money(p.amount)}</strong>
                                          </div>
                                        `).join("")}
                                      </div>
                                    `
                                    : `
                                      <div class="client-no-payments">
                                        Nenhum pagamento registrado nesta parcela.
                                      </div>
                                    `
                                  }

                                  ${
                                    !partPaid
                                    ? `
                                      <button type="button"
                                        class="client-receive-btn"
                                        data-client-pay="${esc(String(part.id))}">
                                        REGISTRAR RECEBIMENTO
                                      </button>
                                    `
                                    : `<div class="client-installment-paid">✓ Parcela totalmente quitada</div>`
                                  }
                                </div>
                              `;
                            }).join("")
                          : `
                            <div class="client-no-installments">
                              Esta venda não possui parcelas cadastradas.
                              ${balance <= 0.009 ? "Venda totalmente recebida." : "Saldo pendente: " + money(balance)}
                            </div>
                          `
                        }
                      </div>
                    `
                    : ""
                  }
                </article>
              `;
            }).join("")
          : `
            <div class="client-history-empty">
              <span>▤</span>
              <strong>Nenhuma compra registrada</strong>
              <p>As vendas realizadas para este cliente aparecerão aqui.</p>
            </div>
          `
        }
      </div>
    </div>
  `;

  // FECHAR MODAL
  root.querySelector("[data-close-client-history]").onclick = () => {
    root.hidden = true;
    root.classList.remove("client-history-overlay");
  };

  // FECHAR AO CLICAR NO FUNDO
  root.onclick = e => {
    if(e.target === root){
      root.hidden = true;
      root.classList.remove("client-history-overlay");
    }
  };

  // ABRIR OU RECOLHER DETALHES DE UMA VENDA
  root.querySelectorAll("[data-client-sale-details]").forEach(button => {
    button.onclick = () => {
      const saleId = button.dataset.clientSaleDetails;
      renderClientHistory(
        id,
        String(expandedSaleId) === String(saleId) ? null : saleId
      );
    };
  });

  // REGISTRAR PAGAMENTO DE UMA PARCELA
  root.querySelectorAll("[data-client-pay]").forEach(button => {
    button.onclick = () => {
      const item = installments.find(i =>
        String(i.id) === String(button.dataset.clientPay)
      );

      if(!item) return;

      const balance = Math.max(
        0,
        Number(item.amount || 0) - Number(item.paidAmount || 0)
      );

      const raw = prompt(
        "Valor recebido agora. Saldo: " + money(balance),
        balance.toFixed(2)
      );

      if(raw === null) return;

      const normalized = raw.trim().includes(",")
        ? raw.trim().replace(/\./g, "").replace(",", ".")
        : raw.trim();

      const amount = Number(normalized);

      if(
        !Number.isFinite(amount) ||
        amount <= 0 ||
        amount > balance + 0.001
      ){
        toastMsg("Informe um valor válido dentro do saldo.");
        return;
      }

      const payment = {
        id: "pay_" + Date.now(),
        amount: Number(amount.toFixed(2)),
        date: new Date().toISOString()
      };

      if(!Array.isArray(item.payments)){
        item.payments = [];
      }

      item.payments.push(payment);

      item.paidAmount = Math.min(
        Number(item.amount),
        Number(item.paidAmount || 0) + payment.amount
      );

      item.paid = item.paidAmount >= Number(item.amount) - 0.009;

      if(item.paid){
        item.paidAt = payment.date;
      }

      persistAll();

      renderClientHistory(id, expandedSaleId);
      renderInstallments();
      renderDashboard();
      renderCalendar();
      renderSales();

      toastMsg("Pagamento registrado com sucesso!");
    };
  });
}



// ============================================================
// CM MODAS — NOVO SISTEMA DE VENDAS
// Venda direta, cliente, carrinho e controle de pagamento
// ============================================================

/* ============================================================
   SEÇÃO DE VENDAS — CM MODAS
   Substitua o bloco antigo de vendas por este.
   Mantenha o restante do script após HISTÓRICO DE VENDAS.
============================================================ */

let saleCart = [];
let saleInstallmentRows = 0;
let saleFormInitialized = false;

function populateClientSelect(){
  const sel = $("#saleClient");
  if(!sel) return;

  const old = sel.value;

  sel.innerHTML =
    '<option value="">Selecione um cliente</option>' +
    clients.map(c =>
      `<option value="${esc(c.id)}">${esc(c.name)} · ${esc(c.phone || "")}</option>`
    ).join("");

  if(clients.some(c => String(c.id) === String(old))){
    sel.value = old;
  }
}

function populateProductSelect(){
  const sel = $("#saleProduct");
  if(!sel) return;

  const old = sel.value;

  sel.innerHTML =
    '<option value="">Selecione um produto</option>' +
    getCatalog().map(p =>
      `<option value="${esc(p.id)}">${esc(p.name)} · estoque: ${localStock(p)}</option>`
    ).join("");

  if(getCatalog().some(p => String(p.id) === String(old))){
    sel.value = old;
  }
}

function prepareSaleForm(options = {}){
  populateClientSelect();
  populateProductSelect();

  if(!saleFormInitialized || options.reset === true){

    if($("#saleTypeClient")) $("#saleTypeClient").checked = true;
    if($("#saleTypeDirect")) $("#saleTypeDirect").checked = false;
    if($("#saleClientField")) $("#saleClientField").hidden = false;
    if($("#salePaymentMode")) $("#salePaymentMode").value = "cash";
    if($("#saleDiscount")) $("#saleDiscount").value = "0";
    if($("#saleEntry")) $("#saleEntry").value = "0";
    if($("#saleQty")) $("#saleQty").value = "1";
    if($("#saleUnitPrice")) $("#saleUnitPrice").value = "";
    if($("#saleStockDisplay")) $("#saleStockDisplay").value = "";
    if($("#saleProduct")) $("#saleProduct").value = "";
    if($("#saleManualInstallments")) $("#saleManualInstallments").innerHTML = "";

    saleInstallmentRows = 0;
    saleFormInitialized = true;
  }

  renderSaleCart();
  updateSaleTotal();
}

function getSaleProduct(){
  return getCatalog().find(p =>
    String(p.id) === String($("#saleProduct")?.value)
  );
}

/* SELEÇÃO DO PRODUTO */
$("#saleProduct")?.addEventListener("change", () => {
  const p = getSaleProduct();

  $("#saleUnitPrice").value = p
    ? Number(p.price || 0).toFixed(2)
    : "";

  $("#saleStockDisplay").value = p
    ? localStock(p) + " unidade(s)"
    : "";
});

/* ADICIONAR PRODUTO */
$("#addSaleProduct")?.addEventListener("click", () => {
  const p = getSaleProduct();
  const qty = Math.floor(Number($("#saleQty")?.value));

  if(!p){
    toastMsg("Selecione um produto.");
    return;
  }

  if(!Number.isInteger(qty) || qty <= 0){
    toastMsg("Informe uma quantidade válida.");
    return;
  }

  const existing = saleCart.find(item =>
    String(item.productId) === String(p.id)
  );

  const alreadyInCart = existing ? existing.qty : 0;

  if(qty + alreadyInCart > localStock(p)){
    toastMsg("Estoque insuficiente para essa quantidade.");
    return;
  }

  if(existing){
    existing.qty += qty;
  }else{
    saleCart.push({
      productId: p.id,
      productName: p.name,
      qty,
      unitPrice: Number($("#saleUnitPrice")?.value || p.price || 0),
      unitCost: localCost(p)
    });
  }

  // Limpa somente os campos do produto.
  // Cliente e demais informações permanecem.
  if($("#saleQty")) $("#saleQty").value = 1;
  if($("#saleProduct")) $("#saleProduct").value = "";
  if($("#saleUnitPrice")) $("#saleUnitPrice").value = "";
  if($("#saleStockDisplay")) $("#saleStockDisplay").value = "";

  renderSaleCart();
  updateSaleTotal();

  toastMsg("Produto adicionado ao pedido.");
});

/* RENDERIZAR CARRINHO */
function renderSaleCart(){
  const root = $("#saleCart");
  if(!root) return;

  const count = saleCart.reduce(
    (sum,item) => sum + Number(item.qty || 0), 0
  );

  if($("#saleCartCount")){
    $("#saleCartCount").textContent =
      `${count} ${count === 1 ? "ITEM" : "ITENS"}`;
  }

  root.innerHTML = saleCart.map((item,index) => `
    <div class="sales-cart-item">
      <div>
        <strong>${esc(item.productName)}</strong>
        <small>${item.qty} un. × ${money(item.unitPrice)} cada</small>
      </div>

      <div class="sales-cart-price">
        ${money(item.qty * item.unitPrice)}
      </div>

      <button
        type="button"
        class="sales-btn sales-btn-danger sales-cart-remove"
        data-remove-cart="${index}"
      >
        REMOVER
      </button>
    </div>
  `).join("") || `
    <div class="sales-empty">
      Seu carrinho está vazio. Adicione o primeiro produto.
    </div>
  `;

  root.querySelectorAll("[data-remove-cart]").forEach(button => {
    button.addEventListener("click", () => {
      saleCart.splice(Number(button.dataset.removeCart), 1);
      renderSaleCart();
      updateSaleTotal();
    });
  });
}

/* CÁLCULOS */
function saleCartTotals(){
  const subtotal = saleCart.reduce(
    (sum,item) => sum + item.qty * item.unitPrice, 0
  );

  const costTotal = saleCart.reduce(
    (sum,item) => sum + item.qty * item.unitCost, 0
  );

  return {
    subtotal,
    costTotal,
    availableProfit: Math.max(0, subtotal - costTotal)
  };
}

function cents(value){
  return Math.round((Number(value) || 0) * 100);
}

function fromCents(value){
  return value / 100;
}

function installmentRows(){
  return [
    ...($("#saleManualInstallments")
      ?.querySelectorAll(".sale-manual-row") || [])
  ];
}

function manualInstallmentSum(){
  return installmentRows().reduce((sum,row) => {
    const input = row.querySelector(".manual-installment-amount");
    return sum + cents(input?.value);
  }, 0);
}

/* RESUMO DAS PARCELAS */
function refreshManualInstallmentSummary(){
  const sum = manualInstallmentSum();
  const target = updateSaleTotal(false);

  if($("#saleInstallmentsTotal")){
    $("#saleInstallmentsTotal").textContent =
      money(fromCents(sum));
  }

  const diff = cents(target.remaining) - sum;
  const hint = $("#saleInstallmentHint");

  if(!hint) return;

  if(!installmentRows().length){
    hint.textContent =
      "Adicione pelo menos uma parcela e informe seu valor e vencimento.";
  }else if(diff === 0){
    hint.textContent =
      "Perfeito! A soma das parcelas corresponde ao saldo a receber.";
  }else if(diff > 0){
    hint.textContent =
      `Faltam ${money(fromCents(diff))} para completar o saldo da venda.`;
  }else{
    hint.textContent =
      `As parcelas ultrapassam o saldo em ${money(fromCents(Math.abs(diff)))}.`;
  }
}

/* ADICIONAR PARCELA MANUAL */
function addManualInstallment(){
  const root = $("#saleManualInstallments");
  if(!root) return;

  const current = updateSaleTotal(false);

  if(current.remaining <= 0){
    toastMsg("Não há saldo restante para parcelar.");
    return;
  }

  const rows = installmentRows();
  const newCount = rows.length + 1;
  const totalCents = cents(current.remaining);

  const base = Math.floor(totalCents / newCount);
  let remainder = totalCents - base * newCount;

  const allocations = Array.from(
    {length: newCount},
    () => base
  );

  for(
    let i = 0;
    i < allocations.length && remainder > 0;
    i++, remainder--
  ){
    allocations[i]++;
  }

  rows.forEach((row,i) => {
    row.querySelector(".manual-installment-amount").value =
      fromCents(allocations[i]).toFixed(2);
  });

  saleInstallmentRows++;

  const due = new Date();
  due.setDate(due.getDate() + 30 * (newCount - 1));

  const dueValue = dateISO(due);

  const row = document.createElement("div");

  row.className = "sales-installment-row sale-manual-row";

  row.innerHTML = `
    <span class="sales-installment-number">${newCount}</span>

    <div class="sales-field">
      <label>VALOR (R$)</label>
      <input
        class="manual-installment-amount"
        type="number"
        min="0.01"
        step="0.01"
        value="${fromCents(allocations[newCount-1]).toFixed(2)}"
        required
      >
    </div>

    <div class="sales-field">
      <label>VENCIMENTO</label>
      <input
        class="manual-installment-date"
        type="date"
        value="${dueValue}"
        required
      >
    </div>

    <button
      type="button"
      aria-label="Remover parcela"
      title="Remover parcela"
    >×</button>
  `;

  row.querySelector(".manual-installment-amount")
    .addEventListener("input", refreshManualInstallmentSummary);

  row.querySelector(".manual-installment-date")
    .addEventListener("change", refreshManualInstallmentSummary);

  row.querySelector("button").addEventListener("click", () => {
    row.remove();
    renumberManualInstallments();
    refreshManualInstallmentSummary();
  });

  root.appendChild(row);

  renumberManualInstallments();
  refreshManualInstallmentSummary();
}

function renumberManualInstallments(){
  installmentRows().forEach((row,index) => {
    const number = row.querySelector(".sales-installment-number");

    if(number){
      number.textContent = String(index + 1);
    }
  });
}

$("#addManualInstallment")?.addEventListener(
  "click",
  addManualInstallment
);

/* ATUALIZAR VALORES DA VENDA */
function updateSaleTotal(refreshInstallments = true){
  const totals = saleCartTotals();

  const discountInput = $("#saleDiscount");
  const discount = Math.max(
    0,
    Number(discountInput?.value || 0)
  );

  const validDiscount = Math.min(
    discount,
    totals.availableProfit
  );

  if(discountInput){
    discountInput.max = totals.availableProfit.toFixed(2);

    discountInput.setCustomValidity(
      discount > totals.availableProfit
        ? "O desconto não pode ultrapassar o lucro disponível."
        : ""
    );
  }

  const total = Math.max(0, totals.subtotal - validDiscount);

  const mode = $("#salePaymentMode")?.value || "cash";
  const entryInput = $("#saleEntry");

  const entry = mode === "cash"
    ? total
    : Number(entryInput?.value || 0);

  if(entryInput){
    entryInput.setCustomValidity(
      entry > total
        ? "A entrada não pode ultrapassar o total da venda."
        : ""
    );
  }

  if($("#saleEntryField")){
    $("#saleEntryField").hidden = mode === "cash";
  }

  if($("#saleAvailableProfit")){
    $("#saleAvailableProfit").textContent =
      money(totals.availableProfit);
  }

  if($("#saleSubtotal")){
    $("#saleSubtotal").textContent = money(totals.subtotal);
  }

  if($("#saleDiscountDisplay")){
    $("#saleDiscountDisplay").textContent = money(validDiscount);
  }

  if($("#saleTotal")){
    $("#saleTotal").textContent = money(total);
  }

  const remaining = Math.max(0, total - entry);

  if($("#saleRemaining")){
    $("#saleRemaining").textContent = money(remaining);
  }

  if($("#saleInstallmentFields")){
    $("#saleInstallmentFields").hidden =
      mode !== "installments";
  }

  const result = {
    ...totals,
    discount: validDiscount,
    total,
    entry,
    remaining
  };

  if(
    refreshInstallments &&
    mode === "installments" &&
    installmentRows().length
  ){
    refreshManualInstallmentSummary();
  }

  return result;
}

/* EVENTOS DE DESCONTO E ENTRADA */
["saleDiscount","saleEntry"].forEach(id => {
  const el = $("#" + id);

  if(el){
    el.addEventListener("input", () => updateSaleTotal());
    el.addEventListener("change", () => updateSaleTotal());
  }
});

/* FORMA DE PAGAMENTO */
$("#salePaymentMode")?.addEventListener("change", () => {
  if(
    $("#salePaymentMode").value === "installments" &&
    !installmentRows().length
  ){
    addManualInstallment();
  }

  updateSaleTotal();
});

/* VENDA DIRETA OU COM CLIENTE */
document.querySelectorAll('input[name="saleType"]')
  .forEach(input => {
    input.addEventListener("change", () => {
      const isClient = input.value === "client";

      if($("#saleClientField")){
        $("#saleClientField").hidden = !isClient;
      }
    });
  });

/* ATUALIZAR ESTOQUE NO CATÁLOGO */
async function saveProductStock(p){
  const payload = {
    ...p,
    stock: localStock(p),
    cost: localCost(p)
  };

  const response = await fetch("/api/products/" + p.id, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if(!response.ok){
    throw new Error(
      "Não foi possível atualizar o estoque de " + p.name
    );
  }
}

/* REGISTRAR VENDA */
$("#saleForm")?.addEventListener("submit", async e => {
  e.preventDefault();

  if(!saleCart.length){
    toastMsg("Adicione pelo menos um produto à venda.");
    return;
  }

  const saleType =
    document.querySelector('input[name="saleType"]:checked')?.value
    || "client";

  const client = saleType === "client"
    ? clients.find(c =>
        String(c.id) === String($("#saleClient")?.value)
      )
    : null;

  if(saleType === "client" && !client){
    toastMsg("Selecione o cliente.");
    return;
  }

  const totals = updateSaleTotal();
  const mode = $("#salePaymentMode")?.value || "cash";

  const entry = mode === "cash"
    ? totals.total
    : totals.entry;

  if(totals.discount > totals.availableProfit){
    toastMsg("O desconto ultrapassa o lucro disponível.");
    return;
  }

  if(entry < 0 || entry > totals.total){
    toastMsg("Confira o valor recebido.");
    return;
  }

  if(totals.total <= 0){
    toastMsg("O total da venda precisa ser maior que zero.");
    return;
  }

  const items = saleCart.map(item => ({...item}));

  for(const item of items){
    const product = getCatalog().find(p =>
      String(p.id) === String(item.productId)
    );

    if(!product || item.qty > localStock(product)){
      toastMsg("Estoque insuficiente: " + item.productName);
      return;
    }
  }

  const remaining = Math.max(0, totals.total - entry);
  const saleId = "sale_" + Date.now();
  const now = new Date().toISOString();

  const sale = {
    id: saleId,
    type: saleType,
    clientId: client?.id || null,
    clientName: client?.name || "Venda direta",
    items,
    productName: items.map(i => i.productName).join(", "),
    qty: items.reduce((sum,i) => sum + i.qty, 0),
    subtotal: totals.subtotal,
    discount: totals.discount,
    total: totals.total,
    costTotal: totals.costTotal,
    profit: Math.max(0, totals.total - totals.costTotal),
    entry,
    paymentMode: mode,
    date: now,
    payments: entry > 0
      ? [{
          amount: entry,
          date: now,
          description: "Entrada da venda"
        }]
      : []
  };

  const newInstallments = [];

  if(remaining > 0 && mode === "installments"){
    const rows = installmentRows();

    if(!rows.length){
      toastMsg("Adicione pelo menos uma parcela.");
      return;
    }

    const sum = manualInstallmentSum();

    if(sum !== cents(remaining)){
      toastMsg(
        "A soma das parcelas precisa ser exatamente igual ao saldo a receber."
      );
      return;
    }

    for(let i = 0; i < rows.length; i++){
      const amount = Number(
        rows[i].querySelector(".manual-installment-amount").value
      );

      const dueDate =
        rows[i].querySelector(".manual-installment-date").value;

      if(!Number.isFinite(amount) || amount <= 0){
        toastMsg(`Informe um valor válido na parcela ${i+1}.`);
        return;
      }

      if(!dueDate){
        toastMsg(`Informe o vencimento da parcela ${i+1}.`);
        return;
      }

      newInstallments.push({
        id: "p" + Date.now() + "_" + i,
        saleId,
        clientId: client?.id || null,
        clientName: client?.name || "Venda direta",
        productName: sale.productName,
        amount: Number(amount.toFixed(2)),
        dueDate,
        paid: false,
        paidAmount: 0,
        payments: []
      });
    }

  }else if(remaining > 0 && mode === "open"){

    newInstallments.push({
      id: "p" + Date.now() + "_open",
      saleId,
      clientId: client?.id || null,
      clientName: client?.name || "Venda direta",
      productName: sale.productName,
      amount: Number(remaining.toFixed(2)),
      dueDate: null,
      paid: false,
      paidAmount: 0,
      payments: [],
      noDueDate: true
    });

  }else if(remaining > 0 && mode === "cash"){

    toastMsg(
      "Para registrar o saldo restante, escolha parcelado ou em aberto."
    );

    return;
  }

  /* BAIXA DO ESTOQUE */
  const stockChanges = [];

  try{
    for(const item of items){
      const product = getCatalog().find(p =>
        String(p.id) === String(item.productId)
      );

      const previousStock = localStock(product);

      stockMap[product.id] = previousStock - item.qty;

      stockChanges.push({
        product,
        previousStock
      });
    }

    for(const change of stockChanges){
      await saveProductStock(change.product);
    }

  }catch(error){

    for(const change of stockChanges){
      stockMap[change.product.id] = change.previousStock;
    }

    persistAll();

    console.error(error);

    toastMsg(
      "Não foi possível atualizar o estoque. Venda não registrada."
    );

    return;
  }

  /* SALVAR VENDA */
  sales.push(sale);
  installments.push(...newInstallments);

  persistAll();

  /* LIMPAR FORMULÁRIO APÓS SUCESSO */
  saleCart = [];

  $("#saleForm")?.reset();

  if($("#saleTypeClient")) $("#saleTypeClient").checked = true;
  if($("#saleTypeDirect")) $("#saleTypeDirect").checked = false;
  if($("#saleClientField")) $("#saleClientField").hidden = false;
  if($("#saleDiscount")) $("#saleDiscount").value = "0";
  if($("#saleEntry")) $("#saleEntry").value = "0";
  if($("#salePaymentMode")) $("#salePaymentMode").value = "cash";
  if($("#saleQty")) $("#saleQty").value = 1;

  if($("#saleManualInstallments")){
    $("#saleManualInstallments").innerHTML = "";
  }

  saleInstallmentRows = 0;
  saleFormInitialized = true;

  prepareSaleForm({reset:true});

  renderSales();
  renderInstallments();
  renderDashboard();

  toastMsg("Venda registrada e estoque atualizado!");
});

/* FIM DA SEÇÃO DE VENDAS */

// HISTÓRICO DE VENDAS
function renderSales(){
  const root = $("#salesList");
  if(!root) return;

  const search = ($("#salesSearch")?.value || "")
    .trim()
    .toLocaleLowerCase("pt-BR");

  const type = $("#salesTypeFilter")?.value || "all";

  const list = sales.slice().reverse().filter(s => {
    const text = [
      s.clientName,
      s.productName,
      ...(s.items || []).map(i => i.productName)
    ].join(" ").toLocaleLowerCase("pt-BR");

    const typeMatch = type === "all" || s.type === type;

    return typeMatch && text.includes(search);
  });

  root.innerHTML = list.map(s => {
    const received = Number(s.entry || 0) +
      installments
        .filter(i => i.saleId === s.id)
        .reduce((sum, i) => sum + Number(i.paidAmount || 0), 0);

    const pending = Math.max(0, Number(s.total || 0) - received);

    const products = (s.items || [])
      .map(i => `${esc(i.productName)} (${i.qty} un.)`)
      .join(", ") || esc(s.productName || "Produto");

    return `
      <div class="data-row">
        <div class="data-row-main">
          <strong>${esc(s.clientName || "Venda direta")}</strong>
          <small>${products}</small>
          <small>
            ${new Date(s.date).toLocaleDateString("pt-BR")}
            · ${s.type === "direct" ? "Venda direta" : "Cliente cadastrado"}
          </small>
        </div>

        <div class="data-row-main">
          <strong>${money(s.total)}</strong>
          <small>Recebido: ${money(received)}</small>
          <small>Em aberto: ${money(pending)}</small>
        </div>

        <button type="button" data-sale-details="${esc(s.id)}">
          DETALHES
        </button>
      </div>
    `;
  }).join("") || `
    <div class="empty">Nenhuma venda encontrada.</div>
  `;

  root.querySelectorAll("[data-sale-details]").forEach(button => {
    button.addEventListener("click", () => {
      const sale = sales.find(s => s.id === button.dataset.saleDetails);
      if(!sale) return;

      const details = $("#saleDetails");
      if(!details) return;

      const products = (sale.items || []).map(i => `
        <div class="data-row">
          <div class="data-row-main">
            <strong>${esc(i.productName)}</strong>
            <small>
              ${i.qty} × ${money(i.unitPrice)}
            </small>
          </div>
          <strong>${money(i.qty * i.unitPrice)}</strong>
        </div>
      `).join("");

      details.innerHTML = `
        <h3>Detalhes da venda</h3>
        <p><strong>${esc(sale.clientName || "Venda direta")}</strong></p>
        ${products}
        <p>Subtotal: ${money(sale.subtotal ?? sale.total)}</p>
        <p>Desconto: ${money(sale.discount || 0)}</p>
        <p>Total: <strong>${money(sale.total)}</strong></p>
        <p>Entrada: ${money(sale.entry || 0)}</p>
      `;

      details.scrollIntoView({behavior:"smooth", block:"nearest"});
    });
  });
}

if($("#salesSearch")){
  $("#salesSearch").addEventListener("input", renderSales);
}

if($("#salesTypeFilter")){
  $("#salesTypeFilter").addEventListener("change", renderSales);
}

// FINANCEIRO E PARCELAS

function renderInstallments(){
  const filter = $("#installmentFilter")?.value || "all";

  const open = installments
    .filter(i => !i.paid)
    .reduce((sum, i) => {
      return sum + Math.max(
        0,
        Number(i.amount) - Number(i.paidAmount || 0)
      );
    }, 0);

  const late = installments
    .filter(i => dueStatus(i) === "late")
    .reduce((sum, i) => {
      return sum + Math.max(
        0,
        Number(i.amount) - Number(i.paidAmount || 0)
      );
    }, 0);

  $("#financeOpen").textContent = money(open);
  $("#financeLate").textContent = money(late);
  $("#financePaid").textContent = money(receivedTotal());

  const list = installments
    .slice()
    .sort((a, b) => {
      if(!a.dueDate) return 1;
      if(!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    })
    .filter(i => {
      const status = dueStatus(i);

      return (
        filter === "all" ||
        (filter === "paid" && i.paid) ||
        (filter === "late" && status === "late") ||
        (filter === "pending" && !i.paid && status !== "late")
      );
    });

  $("#installmentsList").innerHTML = list.map(i => {
    const status = dueStatus(i);

    const balance = Math.max(
      0,
      Number(i.amount) - Number(i.paidAmount || 0)
    );

    const history = Array.isArray(i.payments)
      ? i.payments
      : [];

    return `
      <div class="data-row">
        <div class="data-row-main">
          <strong>
            ${esc(i.clientName || "Venda direta")}
            · ${esc(i.productName || "Produtos")}
          </strong>

          <small>
            ${i.noDueDate || !i.dueDate
              ? "Sem vencimento definido"
              : "Vencimento: " +
                parseDate(i.dueDate).toLocaleDateString("pt-BR")}
          </small>

          <small>
            Valor: ${money(i.amount)}
            · Recebido: ${money(i.paidAmount || 0)}
            · Saldo: ${money(balance)}
          </small>

          ${badge(status)}

          ${
            history.length
              ? `
                <details>
                  <summary>Histórico de recebimentos (${history.length})</summary>
                  ${history.map(p => `
                    <small>
                      ${new Date(p.date).toLocaleString("pt-BR")}
                      · ${money(p.amount)}
                    </small>
                  `).join("")}
                </details>
              `
              : ""
          }
        </div>

        <div class="data-row-actions">
          ${
            !i.paid
              ? `<button type="button" data-pay="${esc(i.id)}">RECEBER</button>`
              : `<span>QUITADA</span>`
          }
        </div>
      </div>
    `;
  }).join("") || `
    <div class="empty">Nenhum lançamento nesta situação.</div>
  `;

  $("#installmentsList").querySelectorAll("[data-pay]").forEach(button => {
    button.onclick = () => {
      const item = installments.find(
        x => String(x.id) === String(button.dataset.pay)
      );

      if(!item) return;

      const balance = Math.max(
        0,
        Number(item.amount) - Number(item.paidAmount || 0)
      );

      const raw = prompt(
        "Valor recebido agora. Saldo: " + money(balance),
        balance.toFixed(2)
      );

      if(raw === null) return;

      const amount = Number(
        raw.trim().replace(/\./g, "").replace(",", ".")
      );

      if(
        !Number.isFinite(amount) ||
        amount <= 0 ||
        amount > balance + 0.001
      ){
        toastMsg("Informe um valor válido dentro do saldo.");
        return;
      }

      const payment = {
        id: "pay_" + Date.now(),
        amount,
        date: new Date().toISOString()
      };

      // Guarda o histórico individual de cada recebimento.
      if(!Array.isArray(item.payments)){
        item.payments = [];
      }

      item.payments.push(payment);

      // Atualiza o acumulado da parcela.
      item.paidAmount = Math.min(
        Number(item.amount),
        Number(item.paidAmount || 0) + amount
      );

      item.paid =
        item.paidAmount >= Number(item.amount) - 0.009;

      if(item.paid){
        item.paidAt = payment.date;
      }

      persistAll();

      renderInstallments();
      renderDashboard();
      renderCalendar();
      renderSales();
      renderCashHistory();

      toastMsg("Recebimento registrado no caixa. Estoque não foi alterado.");
    };
  });
}

$("#installmentFilter").addEventListener(
  "change",
  renderInstallments
);

// CALENDÁRIO
function renderCalendar(){
 const year=calendarDate.getFullYear();
 const month=calendarDate.getMonth();

 $("#calendarMonth").textContent=calendarDate.toLocaleDateString("pt-BR",{month:"long",year:"numeric"});

 const first=new Date(year,month,1);
 const offset=first.getDay();
 const days=new Date(year,month+1,0).getDate();

 let cells="";

 for(let i=0;i<offset;i++){
  cells+='<div class="calendar-day muted"></div>';
 }

 for(let day=1;day<=days;day++){
  const key=dateISO(new Date(year,month,day));
  const items=installments.filter(i=>i.dueDate===key);
  const statuses=items.map(dueStatus);

  const cls=statuses.includes("late")
   ?"has-late"
   :statuses.includes("soon")
    ?"has-soon"
    :statuses.includes("paid")
     ?"has-paid"
     :"";

  cells+=`
   <button class="calendar-day ${cls} ${selectedCalendarDay===key?"selected":""}" data-day="${key}">
    <strong>${day}</strong>
    ${items.length?`<small>${items.length} parcela(s)</small>`:""}
   </button>
  `;
 }

 $("#calendarGrid").innerHTML=cells;

 $("#calendarGrid").querySelectorAll("[data-day]").forEach(b=>{
  b.onclick=()=>{
   selectedCalendarDay=b.dataset.day;
   renderCalendar();

   const items=installments.filter(i=>i.dueDate===selectedCalendarDay);

   $("#calendarDayDetails").innerHTML=`
    <h4>${parseDate(selectedCalendarDay).toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"})}</h4>
   `+(items.map(i=>`
    <div class="compact-row">
     <span>
      ${esc(i.clientName)} · ${esc(i.productName)}
      <small>${badge(dueStatus(i))}</small>
     </span>
     <strong>${money(i.amount)}</strong>
    </div>
   `).join("")||"Nenhum vencimento neste dia.");
  };
 });
}

$("#calendarPrev").onclick=()=>{
 calendarDate.setMonth(calendarDate.getMonth()-1);
 renderCalendar();
};

$("#calendarNext").onclick=()=>{
 calendarDate.setMonth(calendarDate.getMonth()+1);
 renderCalendar();
};

// ESTOQUE

function renderStockOverview(){
  const list = getCatalog();

  const units = list.reduce((sum,p) => sum + localStock(p), 0);
  const low = list.filter(p => localStock(p) > 0 && localStock(p) <= 5).length;
  const empty = list.filter(p => localStock(p) <= 0).length;

  $("#stockOverview").innerHTML = `
    <div class="stock-tile stock-tile-total">
      <span><i></i> Produtos cadastrados</span>
      <strong>${list.length}</strong>
      <small>Masculinos e femininos</small>
    </div>

    <div class="stock-tile stock-tile-units">
      <span><i></i> Unidades disponíveis</span>
      <strong>${units}</strong>
      <small>Peças em estoque</small>
    </div>

    <div class="stock-tile stock-tile-low">
      <span><i></i> Estoque baixo</span>
      <strong>${low}</strong>
      <small>Até 5 unidades</small>
    </div>

    <div class="stock-tile stock-tile-empty">
      <span><i></i> Sem estoque</span>
      <strong>${empty}</strong>
      <small>Produtos zerados</small>
    </div>

    <div class="stock-tile stock-tile-investment">
      <span><i></i> Valor investido</span>
      <strong>${money(totalStockValue())}</strong>
      <small>Custo das peças disponíveis</small>
    </div>
  `;
}


function toastMsg(message){
 const el=$("#toast");
 if(!el)return;

 el.textContent=message;
 el.classList.add("show");
 setTimeout(()=>el.classList.remove("show"),2400);
}

// BOTÕES DE MOVIMENTAÇÃO DO CAIXA
$("#addRevenueBtn").onclick=()=>{
 addCashMovement("revenue");
};

$("#addExpenseBtn").onclick=()=>{
 addCashMovement("expense");
};

// HISTÓRICO DE MOVIMENTAÇÕES
$("#cashHistoryBtn").onclick=()=>{
 renderCashHistory();
};

$("#closeCashHistory").onclick=()=>{
 $("#cashHistoryModal").classList.remove("open");
};

$("#cashHistoryModal").onclick=e=>{
 if(e.target===$("#cashHistoryModal")){
  $("#cashHistoryModal").classList.remove("open");
 }
};

// ATUALIZAÇÃO DO CATÁLOGO
$("#refreshManagement").onclick=async()=>{
 await refreshCatalog();
 renderDashboard();
 renderStockOverview();
 prepareSaleForm();
 toastMsg("Informações atualizadas.");
};

const originalLogin=$("#loginAdmin").onclick;

$("#loginAdmin").addEventListener("click",async()=>{
 setTimeout(async()=>{
  if(!$("#adminContent").hidden){
   await refreshCatalog();
   renderDashboard();
   renderClients();
   renderSales();
   renderStockOverview();
  }
 },250);
});

$("#adminAccess").addEventListener("click",async()=>{
 setTimeout(async()=>{
  if(!$("#adminContent").hidden){
   await refreshCatalog();
   renderDashboard();
   renderClients();
   renderSales();
   renderStockOverview();
  }
 },250);
});

const originalTabs=document.querySelectorAll(".management-tab");

$("#adminContent").addEventListener("click",e=>{
 const tab=e.target.closest(".management-tab");

 if(tab){
  if(tab.dataset.panel==="salesPanel")renderSales();
 }
});

window.addEventListener("storage",()=>{
 clients=read(STORE.clients);
 sales=read(STORE.sales);
 installments=read(STORE.installments);
});

})(); 


const categoriasPorColecao = {
  masculino: [
    "Camisas",
    "Bermudas",
    "Calças",
    "Conjuntos",
    "Calçados",
    "Acessórios"
  ],

  feminino: [
    "Vestidos",
    "Conjuntos",
    "Macacão",
    "Blusas",
    "Shorts",
    "Calças",
    "Roupas íntimas",
    "Calçados",
    "Acessórios"
  ]
};

function carregarCategoriasCadastro() {
  const colecao = document.getElementById("pGender");
  const categoria = document.getElementById("pCategory");

  if (!colecao || !categoria) return;

  const categorias = categoriasPorColecao[colecao.value] || [];

  categoria.innerHTML = '<option value="">Selecione uma categoria</option>';

  categorias.forEach(nome => {
    const opcao = document.createElement("option");
    opcao.value = nome;
    opcao.textContent = nome;
    categoria.appendChild(opcao);
  });
}

document.getElementById("pGender")?.addEventListener("change", () => {
  carregarCategoriasCadastro();
});

carregarCategoriasCadastro();

function normalizeCategory(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}


/* =========================================
   CM MODAS — GERENCIAMENTO DE BANNERS
========================================= */

(() => {
  "use strict";

  const API = "/api/banners";
  const MAX_SIZE = 1.5 * 1024 * 1024;
  const INTERVAL = 15000;

  const uploadInput = document.getElementById("bannerUpload");
  const bannerList = document.getElementById("bannerAdminList");
  const saveButton = document.getElementById("saveBanners");

  let banners = [];
  let removedBanners = [];
  let saving = false;

  // =====================================
  // UTILITÁRIOS
  // =====================================

  async function request(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.erro || "Não foi possível concluir a operação.");
    }

    return data;
  }

  function readImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Erro ao ler a imagem."));

      reader.readAsDataURL(file);
    });
  }

  function showMessage(message) {
    if (typeof window.toast === "function") {
      window.toast(message);
      return;
    }

    alert(message);
  }

  // =====================================
  // CARREGAR BANNERS DO MONGODB
  // =====================================

  async function loadBanners() {
    if (!bannerList) return;

    try {
      const data = await request(API);

      banners = data.map(banner => ({
        id: banner.id,
        image: banner.image,
        persisted: true
      }));

      removedBanners = [];
      renderBanners();

    } catch (error) {
      console.error("Erro ao carregar banners:", error);
      bannerList.innerHTML =
        '<div class="banner-admin-empty">Não foi possível carregar os banners.</div>';
    }
  }

  // =====================================
  // MOSTRAR BANNERS NO PAINEL
  // =====================================

  function renderBanners() {
    if (!bannerList) return;

    if (!banners.length) {
      bannerList.innerHTML =
        '<div class="banner-admin-empty">Nenhum banner carregado. Adicione suas imagens acima.</div>';
      return;
    }

    bannerList.innerHTML = banners.map((banner, index) => `
      <article class="banner-admin-item" data-index="${index}">
        <div class="banner-admin-preview">
          <img src="${banner.image}" alt="Banner ${index + 1}">
        </div>

        <div class="banner-admin-info">
          <strong>Banner ${index + 1}</strong>
          <small>${banner.persisted ? "Salvo no banco de dados" : "Novo banner"}</small>
        </div>

        <div class="banner-admin-controls">
          <button type="button" data-action="up" data-index="${index}"
            ${index === 0 ? "disabled" : ""} title="Mover para cima">↑</button>

          <button type="button" data-action="down" data-index="${index}"
            ${index === banners.length - 1 ? "disabled" : ""} title="Mover para baixo">↓</button>

          <button type="button" data-action="remove" data-index="${index}"
            title="Excluir banner">✕</button>
        </div>
      </article>
    `).join("");
  }

  // =====================================
  // ADICIONAR IMAGENS
  // =====================================

  if (uploadInput) {
    uploadInput.addEventListener("change", async () => {
      const files = Array.from(uploadInput.files || []);

      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          showMessage(`${file.name}: selecione um arquivo de imagem.`);
          continue;
        }

        if (file.size > MAX_SIZE) {
          showMessage(`${file.name}: a imagem deve ter no máximo 1,5 MB.`);
          continue;
        }

        try {
          const image = await readImage(file);

          banners.push({
            id: `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            image,
            persisted: false
          });

        } catch (error) {
          showMessage(error.message);
        }
      }

      renderBanners();
      uploadInput.value = "";
    });
  }

  // =====================================
  // MOVER E EXCLUIR BANNERS
  // =====================================

  if (bannerList) {
    bannerList.addEventListener("click", event => {
      const button = event.target.closest("[data-action]");
      if (!button || saving) return;

      const index = Number(button.dataset.index);
      const action = button.dataset.action;

      if (!Number.isInteger(index) || !banners[index]) return;

      if (action === "up" && index > 0) {
        [banners[index - 1], banners[index]] =
          [banners[index], banners[index - 1]];
      }

      if (action === "down" && index < banners.length - 1) {
        [banners[index + 1], banners[index]] =
          [banners[index], banners[index + 1]];
      }

      if (action === "remove") {
        const removed = banners.splice(index, 1)[0];

        if (removed.persisted) {
          removedBanners.push(removed.id);
        }
      }

      renderBanners();
    });
  }

  // =====================================
  // SALVAR NO MONGODB
  // =====================================

  async function saveBanners() {
    if (saving) return;

    saving = true;

    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "SALVANDO...";
    }

    try {
      // Primeiro cadastra os novos banners.
      for (const banner of banners) {
        if (!banner.persisted) {
          const result = await request(API, {
            method: "POST",
            body: JSON.stringify({
              image: banner.image,
              order: banners.indexOf(banner)
            })
          });

          banner.id = result.banner.id;
          banner.persisted = true;
        }
      }

      // Exclui os banners removidos.
      for (const id of removedBanners) {
        await request(`${API}/${encodeURIComponent(id)}`, {
          method: "DELETE"
        });
      }

      // Atualiza a ordem de exibição.
      await request(`${API}/order`, {
        method: "PUT",
        body: JSON.stringify({
          ids: banners.map(banner => banner.id)
        })
      });

      removedBanners = [];

      await loadBanners();
      await loadPublicBanners();

      showMessage("Banners salvos com sucesso!");

    } catch (error) {
      console.error("Erro ao salvar banners:", error);
      showMessage(error.message);
      await loadBanners();

    } finally {
      saving = false;

      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = "SALVAR ALTERAÇÕES";
      }
    }
  }

  if (saveButton) {
    saveButton.addEventListener("click", saveBanners);
  }

  // =====================================
  // CARROSSEL PÚBLICO DA PÁGINA INICIAL
  // =====================================

  let publicBanners = [];
  let currentBanner = 0;
  let bannerTimer = null;

  async function loadPublicBanners() {
    const bannerImage = document.querySelector("#home .banner-image");

    if (!bannerImage) return;

    try {
      const data = await request(API);

      publicBanners = data
        .sort((a, b) => a.order - b.order)
        .map(banner => banner.image);

      currentBanner = 0;

      if (bannerTimer) {
        clearInterval(bannerTimer);
        bannerTimer = null;
      }

      if (!publicBanners.length) return;

      bannerImage.style.transition = "opacity .8s ease";
      bannerImage.style.opacity = "1";
      bannerImage.src = publicBanners[0];

      if (publicBanners.length > 1) {
        bannerTimer = setInterval(() => {
          currentBanner = (currentBanner + 1) % publicBanners.length;

          bannerImage.style.opacity = "0";

          setTimeout(() => {
            bannerImage.src = publicBanners[currentBanner];

            bannerImage.onload = () => {
              bannerImage.style.opacity = "1";
            };
          }, 400);

        }, INTERVAL);
      }

    } catch (error) {
      console.error("Erro ao carregar banners públicos:", error);
    }
  }

  // =====================================
  // ABRIR ABA DE BANNERS NO ADMIN
  // =====================================

  document.addEventListener("click", event => {
    const tab = event.target.closest(
      '.management-tab[data-panel="bannersPanel"]'
    );

    if (tab) {
      loadBanners();
    }
  });

  // Inicialização
  loadPublicBanners();

})();

// ==========================================
// CM MODAS — INSTALAÇÃO PWA
// ==========================================

let deferredInstallPrompt = null;

const installAppBtn = document.getElementById("installAppBtn");
const installAppBanner = document.getElementById("installAppBanner");

// Detectar se já está instalado
function isAppInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches ||
         window.navigator.standalone === true;
}

// Esconder botão se já estiver instalado
if (isAppInstalled()) {
  installAppBanner.style.display = "none";
}

// Detectar instalação disponível no Android
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();

  deferredInstallPrompt = event;

  installAppBanner.style.display = "flex";
});

// Clicar para instalar
installAppBtn.addEventListener("click", async () => {

  if (deferredInstallPrompt) {

    deferredInstallPrompt.prompt();

    const result = await deferredInstallPrompt.userChoice;

    if (result.outcome === "accepted") {
      installAppBanner.style.display = "none";
    }

    deferredInstallPrompt = null;

    return;
  }

  // Orientação para iPhone
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  if (isIOS) {
    alert(
      "Para instalar a CM MODAS no seu iPhone:\n\n" +
      "1. Toque no botão Compartilhar do Safari.\n" +
      "2. Escolha 'Adicionar à Tela de Início'.\n" +
      "3. Toque em Adicionar.\n\n" +
      "Pronto! O catálogo estará na tela inicial."
    );

    return;
  }

  // Orientação para navegadores sem prompt disponível
  alert(
    "Para instalar a CM MODAS:\n\n" +
    "Abra o menu do navegador e procure a opção " +
    "'Instalar aplicativo' ou 'Adicionar à tela inicial'."
  );

});

// Detectar instalação concluída
window.addEventListener("appinstalled", () => {
  installAppBanner.style.display = "none";
  deferredInstallPrompt = null;
});

// Registrar Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .catch(error => {
        console.error("Erro ao registrar aplicativo:", error);
      });
  });
}