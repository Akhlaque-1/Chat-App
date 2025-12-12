/* ------------- Config -------------- */
const STORAGE_KEY = "wa_pro_chat_v1";
const THEME_KEY = "wa_pro_theme_v1";

/* Simulated bots with varied reply sets */
const BOTS = {
  helper: {
    id: "helper", name: "Helper", avatar: "https://i.pravatar.cc/48?img=32",
    desc: "Friendly helper bot",
    replies: [
      "Hi! How can I help you today?",
      "Sure — try breaking the task into smaller steps.",
      "You can also search online docs for quick examples.",
      "I suggest starting with a simple prototype first.",
      "If you need, I can give a short checklist."
    ]
  },
  funny: {
    id: "funny", name: "Funny", avatar: "https://i.pravatar.cc/48?img=56",
    desc: "Makes jokes",
    replies: [
      "Why did the developer go broke? Because he used up all his cache.",
      "I told a UDP joke, you might not get it.",
      "I tried to catch some fog earlier. Mist!",
      "I would tell you a joke about UDP — but I'm not sure you'd get the response."
    ]
  },
  info: {
    id: "info", name: "Info", avatar: "https://i.pravatar.cc/48?img=14",
    desc: "Gives facts",
    replies: [
      "JS was created in 10 days.",
      "Pro tip: comment your code for future you.",
      "Fun fact: the first computer bug was a real moth."
    ]
  }
};

/* ------------- DOM -------------- */
const chatWindow = document.getElementById("chatWindow");
const messageInput = document.getElementById("messageInput");
const composer = document.getElementById("composer");
const botSelect = document.getElementById("botSelect");
const botAvatarEl = document.getElementById("botAvatar");
const botNameEl = document.getElementById("botName");
const botDescEl = document.getElementById("botDesc");
const typingIndicator = document.getElementById("typingIndicator");
const typingText = document.getElementById("typingText");
const clearBtn = document.getElementById("clearBtn");
const themeToggle = document.getElementById("themeToggle");
const reactionList = document.getElementById("reactionList");
const imageInput = document.getElementById("imageInput");
const statusText = document.getElementById("statusText");

/* ------------- State -------------- */
let messages = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let selectedBot = botSelect.value || "helper";
let typingTimeout = null;

/* ------------- Utilities -------------- */
const nowTime = () => new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
const setStatus = (txt) => { if(statusText) statusText.textContent = txt; };

/* Simple beep (no files) */
const beep = (freq=800, duration=70) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = freq; o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 0.01);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration/1000);
    setTimeout(()=>{ o.stop(); ctx.close(); }, duration+30);
  } catch(e) { /* ignore */ }
};

/* ------------- Rendering -------------- */
function renderAll(){
  chatWindow.innerHTML = "";
  messages.forEach((m, idx) => {
    const el = buildMessageEl(m, idx);
    chatWindow.appendChild(el);
    // animate in
    requestAnimationFrame(()=> setTimeout(()=> el.classList.add("show"), 20));
  });
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function buildMessageEl(message, index){
  const wrapper = document.createElement("div");
  wrapper.className = `msg ${message.sender === "user" ? "user" : "bot"}`;

  // avatar
  const avatar = document.createElement("img");
  avatar.className = "avatar";
  avatar.src = message.avatar || (message.sender === "user" ? `https://i.pravatar.cc/48?img=3` : BOTS[selectedBot].avatar);
  wrapper.appendChild(avatar);

  // content
  const content = document.createElement("div");
  content.className = "content";

  if(message.type === "image"){
    const img = document.createElement("img");
    img.src = message.imageData;
    img.style.maxWidth = "260px";
    img.style.borderRadius = "10px";
    content.appendChild(img);
  } else {
    const p = document.createElement("div");
    p.textContent = message.text;
    content.appendChild(p);
  }

  // meta
  const meta = document.createElement("div");
  meta.className = "meta";
  const time = document.createElement("span");
  time.className = "time";
  time.textContent = message.time || nowTime();
  meta.appendChild(time);

  // reactions (if any)
  const reactionsWrap = document.createElement("span");
  reactionsWrap.className = "reactions";
  if(message.reactions && message.reactions.length){
    message.reactions.forEach(r => {
      const rEl = document.createElement("span");
      rEl.textContent = r;
      reactionsWrap.appendChild(rEl);
    });
  }
  meta.appendChild(reactionsWrap);

  content.appendChild(meta);
  wrapper.appendChild(content);

  // long-press (mobile) or right-click (desktop) to delete
  let longPressTimer = null;
  wrapper.addEventListener("touchstart", () => {
    longPressTimer = setTimeout(()=> {
      if(confirm("Delete this message?")) { messages.splice(index,1); save(); renderAll(); }
    }, 700);
  });
  wrapper.addEventListener("touchend", ()=> clearTimeout(longPressTimer));
  wrapper.addEventListener("contextmenu", (e) => {
    if(e.target.closest(".msg")){ e.preventDefault(); if(confirm("Delete this message?")){ messages.splice(index,1); save(); renderAll(); } }
  });

  return wrapper;
}

/* ------------- Actions -------------- */
function addMessage({text="", sender="user", type="text", imageData=null}){
  const msg = {
    id: 'm_' + Date.now() + '_' + Math.floor(Math.random()*9999),
    text, sender, time: nowTime(), type, imageData,
    avatar: sender === "user" ? `https://i.pravatar.cc/48?img=3` : BOTS[selectedBot].avatar,
    reactions: []
  };
  messages.push(msg);
  save();
  renderAll();
  return msg;
}

/* Bot reply: typing indicator + reply after delay */
function botReply(){
  const bot = BOTS[selectedBot];
  if(!bot) return;
  showTyping(true, `${bot.name} is typing...`);
  const delay = Math.random()*1500 + 700;
  typingTimeout = setTimeout(()=> {
    showTyping(false);
    const reply = bot.replies[Math.floor(Math.random()*bot.replies.length)];
    addMessage({text: reply, sender: "bot"});
    beep(600, 70);
  }, delay);
}

/* show/hide typing */
function showTyping(show=true, txt="Bot is typing..."){
  const el = document.getElementById("typingIndicator");
  const t = document.getElementById("typingText");
  if(!el) return;
  if(show){ el.style.display = "flex"; t.textContent = txt; }
  else { el.style.display = "none"; }
}

/* ------------- Event handlers -------------- */

/* Submit (send message) */
composer.addEventListener("submit", (e) => {
  e.preventDefault();
  const txt = messageInput.value.trim();
  if(!txt) return;
  addMessage({text: txt, sender: "user"});
  messageInput.value = "";
  beep(900, 60);
  // bot reply after short delay
  setTimeout(()=> botReply(), 250 + Math.random()*300);
});

/* Change active bot */
botSelect.addEventListener("change", (e) => {
  selectedBot = e.target.value;
  const bot = BOTS[selectedBot];
  if(bot){
    const botAvatar = document.getElementById("botAvatar");
    const botName = document.getElementById("botName");
    const botDesc = document.getElementById("botDesc");
    if(botAvatar) botAvatar.src = bot.avatar;
    if(botName) botName.textContent = bot.name;
    if(botDesc) botDesc.textContent = bot.desc;
  }
});

/* Clear chat */
clearBtn.addEventListener("click", () => {
  if(confirm("Clear chat history? This cannot be undone.")){
    messages = [];
    save();
    renderAll();
  }
});

/* Theme toggle */
themeToggle.addEventListener("change", () => {
  document.body.classList.toggle("dark", themeToggle.checked);
  localStorage.setItem(THEME_KEY, themeToggle.checked ? "dark" : "light");
});

/* Quick reaction add (sidebar buttons) - adds to last message */
reactionList.addEventListener("click", (e) => {
  const r = e.target.textContent;
  if(!r) return;
  if(messages.length === 0) return;
  const last = messages[messages.length-1];
  last.reactions = last.reactions || [];
  last.reactions.push(r);
  save();
  renderAll();
});

/* Image upload (front-end only) */
imageInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(ev){
    addMessage({type:"image", imageData: ev.target.result, sender: "user"});
    beep(900, 60);
    setTimeout(()=> botReply(), 800 + Math.random()*500);
    imageInput.value = "";
  };
  // limit file size for LocalStorage safety (optional)
  if(file.size > 1024 * 1024 * 2){ // 2MB
    alert("Please choose an image smaller than 2MB.");
    imageInput.value = "";
    return;
  }
  reader.readAsDataURL(file);
});

/* Prevent drag/drop default */
window.addEventListener("dragover",(e)=> e.preventDefault());
window.addEventListener("drop",(e)=> e.preventDefault());

/* ------------- Initialization -------------- */
(function init(){
  // Restore theme
  const theme = localStorage.getItem(THEME_KEY);
  if(theme === "dark"){ themeToggle.checked = true; document.body.classList.add("dark"); }

  // set active bot info
  const bot = BOTS[selectedBot];
  if(bot){
    const botAvatar = document.getElementById("botAvatar");
    const botName = document.getElementById("botName");
    const botDesc = document.getElementById("botDesc");
    if(botAvatar) botAvatar.src = bot.avatar;
    if(botName) botName.textContent = bot.name;
    if(botDesc) botDesc.textContent = bot.desc;
  }

  // initial welcome message when empty
  if(messages.length === 0){
    addMessage({text: "Welcome to the WhatsApp-style demo. Send a message to start.", sender: "bot"});
  } else {
    renderAll();
  }
})();
