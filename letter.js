(() => {
  "use strict";

  const form = document.getElementById("access-form");
  const field = document.getElementById("password");
  const button = form.querySelector("button");
  const status = document.getElementById("access-status");
  const packet = JSON.parse(document.getElementById("encrypted-letter").textContent);

  function fromBase64(value) {
    return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  }

  async function decryptLetter(password) {
    const inputKey = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"],
    );
    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: fromBase64(packet.salt),
        iterations: packet.iterations,
        hash: "SHA-256",
      },
      inputKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"],
    );
    return crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(packet.iv), tagLength: 128 },
      key,
      fromBase64(packet.ciphertext),
    );
  }

  function showLetter(bytes) {
    const letter = JSON.parse(new TextDecoder().decode(bytes));
    const markup = document.createElement("template");
    markup.innerHTML = letter.markup;

    document.title = letter.title;

    form.reset();
    document.body.replaceChildren(markup.content);
    initializeLetter();
    document.getElementById("open-letter").focus({ preventScroll: true });
  }

  field.addEventListener("input", () => {
    field.removeAttribute("aria-invalid");
    status.textContent = "";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (button.disabled) return;

    if (!globalThis.crypto?.subtle) {
      status.textContent = "Ouvre la lettre dans un navigateur récent ou via son lien HTTPS.";
      return;
    }

    button.disabled = true;
    button.textContent = "Ouverture…";
    form.setAttribute("aria-busy", "true");
    status.textContent = "";

    let letter;
    try {
      letter = await decryptLetter(field.value.trim());
    } catch {
      status.textContent = "Mot de passe incorrect. Réessaie.";
      field.setAttribute("aria-invalid", "true");
      field.focus();
      field.select();
    } finally {
      form.removeAttribute("aria-busy");
      button.textContent = "Valider";
      button.disabled = false;
    }

    if (letter) showLetter(letter);
  });

  function initializeLetter() {
    const letter = document.getElementById("letter");
    const cover = document.getElementById("cover");
    const question = document.getElementById("question");
    const poem = document.getElementById("poem");
    const openButton = document.getElementById("open-letter");
    const closeButton = document.getElementById("close-letter");
    const choices = document.getElementById("choices");
    const yes = document.getElementById("yes");
    const no = document.getElementById("no");
    const choiceStatus = document.getElementById("choice-status");
    const verses = Array.from(poem.querySelectorAll("[data-verse]"));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const hidingPlaces = [
      [1, .02],
      [0, 1],
      [.08, .05],
      [.54, 1],
      [1, 1],
    ];

    const heartbeats = [
      { scale: 1.15, speed: 270, travel: .65 },
      { scale: 1.31, speed: 205, travel: .9 },
      { scale: 1.49, speed: 148, travel: 1.1 },
      { scale: 1.67, speed: 104, travel: 1.35 },
      { scale: 1.91, speed: 67, travel: 1.6 },
    ];

    const petalColors = ["#b66989", "#c58ca5", "#b193bb", "#e4b5c5", "#ac7096"];
    let step = "sealed";
    let noPresses = 0;
    let noAnimation;
    let settleTimer;
    let verseObserver;

    function pause(ms) {
      return new Promise((resolve) => window.setTimeout(resolve, reducedMotion.matches ? 0 : ms));
    }

    function show(view, focusTarget) {
      for (const section of [cover, question, poem]) {
        section.hidden = section !== view;
      }

      closeButton.hidden = view === cover;
      window.scrollTo(0, 0);
      focusTarget.focus({ preventScroll: true });
    }

    function scatterFrom(button, count, distance) {
      if (reducedMotion.matches) return;

      const buttonBox = button.getBoundingClientRect();
      const fieldBox = choices.getBoundingClientRect();
      const x = buttonBox.left - fieldBox.left + buttonBox.width / 2;
      const y = buttonBox.top - fieldBox.top + buttonBox.height / 2;

      for (let index = 0; index < count; index += 1) {
        const petal = document.createElement("span");
        const angle = index * (Math.PI * 2 / count) + .23;
        const radius = distance * (.62 + Math.random() * .38);
        petal.className = "petal";
        petal.setAttribute("aria-hidden", "true");
        petal.style.left = `${x}px`;
        petal.style.top = `${y}px`;
        petal.style.setProperty("--size", `${4 + Math.random() * 5}px`);
        petal.style.setProperty("--petal", petalColors[index % petalColors.length]);
        petal.style.setProperty("--dx", `${Math.cos(angle) * radius}px`);
        petal.style.setProperty("--dy", `${Math.sin(angle) * radius}px`);
        petal.style.setProperty("--spin", `${index * 37}deg`);
        petal.style.setProperty("--duration", `${460 + Math.random() * 280}ms`);
        petal.addEventListener("animationend", () => petal.remove(), { once: true });
        choices.append(petal);
      }
    }

    function moveNo(place) {
      noAnimation?.cancel();
      scatterFrom(no, 7, 34);

      const [x, y] = place;
      no.style.setProperty("--no-x", x);
      no.style.setProperty("--no-y", y);
      no.classList.add("has-moved");
      choices.classList.add("has-escaped");
      choiceStatus.textContent = `Le bouton Non a changé de place (${noPresses} sur ${hidingPlaces.length}).`;

      if (!reducedMotion.matches) {
        noAnimation = no.animate([
          { opacity: .24, transform: "scale(.78) rotate(-6deg)" },
          { opacity: 1, transform: "scale(1.07) rotate(2deg)", offset: .68 },
          { opacity: 1, transform: "none" },
        ], { duration: 370, easing: "cubic-bezier(.22,1,.36,1)" });
      }
    }

    async function popNo() {
      const hadFocus = document.activeElement === no;
      no.disabled = true;
      choiceStatus.textContent = "Le bouton Non a disparu.";
      if (hadFocus) yes.focus({ preventScroll: true });

      if (!reducedMotion.matches) {
        scatterFrom(no, 15, 63);
        noAnimation?.cancel();
        noAnimation = no.animate([
          { opacity: 1, transform: "scale(1)" },
          { opacity: 1, transform: "scale(1.21) rotate(-7deg)", offset: .37 },
          { opacity: 0, transform: "scale(.06) rotate(14deg)" },
        ], { duration: 390, easing: "cubic-bezier(.4,0,.22,1)", fill: "forwards" });

        try {
          await noAnimation.finished;
        } catch {
          return;
        }
      }

      no.hidden = true;
    }

    function quickenHeartbeat(index) {
      const heartbeat = heartbeats[index];
      yes.style.setProperty("--yes-scale", heartbeat.scale);
      yes.style.setProperty("--shake-speed", `${heartbeat.speed}ms`);
      yes.style.setProperty("--shake-travel", `${heartbeat.travel}px`);

      if (!reducedMotion.matches) {
        yes.classList.remove("is-settling");
        yes.classList.add("is-shaking");
        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(() => {
          yes.classList.remove("is-shaking");
          yes.classList.add("is-settling");
        }, 1150);
      }
    }

    function revealVerses() {
      if (reducedMotion.matches || !("IntersectionObserver" in window)) return;

      verseObserver = new IntersectionObserver((entries) => {
        entries.filter((entry) => entry.isIntersecting).forEach(({ target }, index) => {
          target.style.setProperty("--verse-delay", `${Math.min(index, 4) * 110}ms`);
          target.classList.remove("will-reveal");
          target.classList.add("is-visible");
          verseObserver.unobserve(target);
        });
      }, { threshold: .08 });

      for (const verse of verses) {
        verse.classList.add("will-reveal");
        verseObserver.observe(verse);
      }
    }

    function resetChoices() {
      window.clearTimeout(settleTimer);
      noAnimation?.cancel();
      verseObserver?.disconnect();
      noPresses = 0;

      choices.classList.remove("has-escaped");
      no.hidden = false;
      no.disabled = false;
      no.classList.remove("has-moved");
      no.removeAttribute("style");
      yes.classList.remove("is-shaking", "is-settling");
      yes.removeAttribute("style");
      choiceStatus.textContent = "";

      for (const petal of choices.querySelectorAll(".petal")) petal.remove();
      for (const verse of verses) {
        verse.classList.remove("will-reveal", "is-visible");
        verse.removeAttribute("style");
      }
    }

    openButton.addEventListener("click", async () => {
      if (step !== "sealed") return;
      step = "opening";
      letter.classList.add("is-opening");
      await pause(1320);
      show(question, document.getElementById("question-title"));
      letter.classList.remove("is-opening");
      step = "question";
    });

    no.addEventListener("click", () => {
      if (step !== "question" || no.disabled) return;
      const press = noPresses;
      noPresses += 1;

      if (press < hidingPlaces.length) {
        moveNo(hidingPlaces[press]);
        return;
      }

      const beat = press - hidingPlaces.length;
      quickenHeartbeat(beat);
      if (beat === heartbeats.length - 1) void popNo();
    });

    yes.addEventListener("click", async () => {
      if (step !== "question") return;
      step = "answering";
      closeButton.disabled = true;
      window.clearTimeout(settleTimer);
      yes.classList.remove("is-shaking", "is-settling");
      scatterFrom(yes, 27, 210);
      letter.classList.add("is-answering");

      await pause(750);
      show(poem, document.getElementById("poem-title"));
      revealVerses();
      letter.classList.remove("is-answering");
      closeButton.disabled = false;
      step = "poem";
    });

    closeButton.addEventListener("click", () => {
      if (step !== "question" && step !== "poem") return;
      resetChoices();
      show(cover, openButton);
      step = "sealed";
    });
  }
})();
