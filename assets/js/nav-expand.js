document.addEventListener("DOMContentLoaded", function () {

  // Inside a language section, hide the other languages' tabs. The site is
  // a chooser: once the reader has picked Latin, Spanish and French should
  // not compete for attention. A language tab is recognised by its href
  // (…/latin/, …/spanish/, …/french/), which holds in every locale. The way
  // to another language is Home.
  function focusLanguageTabs() {
    var langs = ["latin", "spanish", "french"];
    function langOf(a) {
      // Resolve the href, so "./" on the Latin page itself counts too.
      var path = new URL(a.getAttribute("href") || "", window.location.href).pathname;
      path = path.replace(/index\.html$/, "");
      for (var i = 0; i < langs.length; i++) {
        if (new RegExp("(^|/)" + langs[i] + "/$").test(path)) return langs[i];
      }
      return null;
    }
    // On the home page the doors are the way into a language, so every
    // language tab goes; inside a language, the other languages' tabs go.
    var onHome = document.body.classList.contains("lm-home");
    var active = document.querySelector(".md-tabs__item--active > .md-tabs__link");
    var current = active ? langOf(active) : null;
    if (!onHome && !current) return;
    var items = document.querySelectorAll(".md-tabs__item");
    for (var j = 0; j < items.length; j++) {
      var link = items[j].querySelector(".md-tabs__link");
      var l = link ? langOf(link) : null;
      if (l && (onHome || l !== current)) items[j].style.display = "none";
    }
  }

  // Tag the body with a class on pages where we don't want the
  // integrated TOC to clutter the sidebar (Home and Screenshots).
  function tagBodyForTocSuppression() {
    var p = window.location.pathname;
    // strip trailing index.html if present
    p = p.replace(/index\.html$/, "");
    if (/^\/((nl|es)\/)?(screenshots\/)?$/.test(p)) {
      document.body.classList.add("hide-integrated-toc");
    }
    // The home page is the chooser: its doors are the navigation, so the
    // tab bar would only repeat them. Hidden there, shown everywhere else.
    if (/^\/((nl|es)\/)?$/.test(p)) {
      document.body.classList.add("lm-home");
    }
  }

  // The header logo is already a link to home. The site title next to it
  // is not — attach a click handler so the entire title area also goes home.
  // Using a handler rather than wrapping the text in an <a> avoids fighting
  // with Material's own DOM layout for the header.
  function makeTitleClickable() {
    var title = document.querySelector(".md-header__title");
    if (!title) return;
    if (title.dataset.clickable === "yes") return; // already wired

    var logoLink = document.querySelector(".md-header__button.md-logo");
    var homeHref = logoLink ? logoLink.getAttribute("href") : ".";

    title.style.cursor = "pointer";
    title.setAttribute("role", "link");
    title.setAttribute("tabindex", "0");
    title.dataset.clickable = "yes";

    function go() {
      window.location.href = homeHref;
    }

    title.addEventListener("click", function (e) {
      // Don't hijack clicks on nested elements that are themselves links
      // (e.g. the search input or any future child link).
      var anchor = e.target.closest && e.target.closest("a, input, button");
      if (anchor && anchor !== title) return;
      go();
    });

    title.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        go();
      }
    });
  }

  // Make a page's INTEGRATED TOC (its own #heading links, injected into the
  // left sidebar by toc.integrate) collapsible, and give it the same chevron
  // Material draws on a section of pages.
  //
  // Two different things produce indented children in that sidebar, and until
  // now only one of them looked clickable. A nav *section* (Verbs, Nouns) has
  // real child pages and gets Material's own chevron. A single page (Adverbs,
  // Pronouns) gets its headings injected by toc.integrate when it is the
  // active page — same visual shape, no chevron, no way to collapse it. The
  // reader has no way to tell that both expand, or that either can be closed.
  //
  // Scoped to the whole primary nav rather than its top level: every one of
  // these hubs is nested inside its language section, which is exactly why
  // the earlier top-level-only selector never fired for them.
  function makeIntegratedTocCollapsible() {
    var items = document.querySelectorAll(
      ".md-nav--primary .md-nav__item--active"
    );
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      // The <a>, not the <label for="__toc"> that precedes it: Material
      // hides that label on desktop, and forcing it visible for the toggle
      // showed the page title twice.
      var link = item.querySelector(":scope > a.md-nav__link");
      var toc = item.querySelector(":scope > nav.md-nav");
      if (!link || !toc) continue;
      var firstAnchor = toc.querySelector("a.md-nav__link");
      if (!firstAnchor) continue;
      var href = firstAnchor.getAttribute("href") || "";
      if (href.indexOf("#") === -1) continue;   // section of pages, not a page TOC
      if (link.dataset.tocCollapse === "yes") continue;
      link.dataset.tocCollapse = "yes";
      link.classList.add("lm-toc-toggle");

      // Material's chevron is an <svg> in a .md-nav__icon it only emits for
      // sections. Build the equivalent so a page TOC reads the same; the
      // rotation is CSS, keyed off .toc-collapsed on the item.
      if (!link.querySelector(".lm-toc-icon")) {
        var icon = document.createElement("span");
        icon.className = "lm-toc-icon";
        icon.setAttribute("aria-hidden", "true");
        link.appendChild(icon);
      }

      link.setAttribute("role", "button");
      link.setAttribute("aria-expanded", "true");

      (function (it, lk) {
        lk.addEventListener("click", function (e) {
          e.preventDefault();
          var collapsed = it.classList.toggle("toc-collapsed");
          lk.setAttribute("aria-expanded", collapsed ? "false" : "true");
        });
      })(item, link);
    }
  }

  var LANG = (document.documentElement.lang || "en").slice(0, 2);
  var LABELS = {
    nl: { expand: "Alles uitklappen", collapse: "Alles inklappen" },
    es: { expand: "Desplegar todo", collapse: "Plegar todo" }
  }[LANG] || { expand: "Expand all", collapse: "Collapse all" };

  function init() {
    if (document.getElementById("nav-expand-btn")) return true;

    // Find the sidebar nav list - try multiple selectors
    // With navigation.tabs, Material lifts the active section into the
    // sidebar and hides the top-level list, so the button has to go into
    // the active section's own list to be visible at all.
    var target =
      document.querySelector(".md-sidebar--primary .md-nav--primary > .md-nav__list > .md-nav__item--active > .md-nav > .md-nav__list") ||
      document.querySelector(".md-sidebar--primary .md-sidebar__inner .md-nav__list") ||
      document.querySelector(".md-sidebar--primary .md-nav__list") ||
      document.querySelector(".md-nav--primary .md-nav__list");

    if (!target) return false;

    var btn = document.createElement("button");
    btn.id = "nav-expand-btn";

    var li = document.createElement("li");
    li.className = "md-nav__item";
    li.style.cssText = "padding:0.3rem 0.6rem 0.5rem; list-style:none;";
    li.appendChild(btn);
    target.insertBefore(li, target.firstChild);

    // navigation.expand opens every section on load; start the button in
    // whatever state the toggles are actually in.
    var boxes = document.querySelectorAll(".md-nav__toggle");
    var open = 0;
    for (var k = 0; k < boxes.length; k++) { if (boxes[k].checked || boxes[k].classList.contains("md-toggle--indeterminate")) open++; }
    var expanded = boxes.length > 0 && open * 2 >= boxes.length;
    btn.textContent = expanded ? LABELS.collapse : LABELS.expand;
    btn.addEventListener("click", function () {
      expanded = !expanded;
      var toggles = document.querySelectorAll(".md-nav__toggle");
      for (var i = 0; i < toggles.length; i++) {
        toggles[i].classList.remove("md-toggle--indeterminate");
        toggles[i].checked = expanded;
      }
      btn.textContent = expanded ? LABELS.collapse : LABELS.expand;
    });

    return true;
  }

  tagBodyForTocSuppression();
  focusLanguageTabs();
  makeTitleClickable();
  if (!init()) { setTimeout(function(){ if(!init()) setTimeout(init, 1000); }, 300); }
  makeIntegratedTocCollapsible();
  setTimeout(makeIntegratedTocCollapsible, 400);
});
