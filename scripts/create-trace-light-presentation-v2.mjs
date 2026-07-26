import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const PROJECT = "E:/py_scrypt/PACT";
const OUT = path.join(PROJECT, "outputs", "TRACE-hackathon-pitch-light-v2.pptx");
const PREVIEW_DIR = path.join(PROJECT, "outputs", "trace-hackathon-pitch-light-v2-preview");

const W = 1280;
const H = 720;
const C = {
  bg: "#F5F5F5",
  paper: "#FFFFFF",
  ink: "#050505",
  muted: "#606067",
  soft: "#EEEAFB",
  violet: "#2B2644",
  line: "#D9D6E6",
};

async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

function bg(slide) {
  slide.background.fill = C.bg;
  slide.shapes.add({
    geometry: "rect",
    position: { left: 0, top: 0, width: W, height: H },
    fill: C.bg,
    line: { style: "solid", fill: "none", width: 0 },
  });
  slide.shapes.add({
    geometry: "rect",
    position: { left: 0, top: 0, width: W, height: H },
    fill: {
      type: "gradient",
      angle: 35,
      stops: [
        { color: "#FFFFFF", offset: 0 },
        { color: C.bg, offset: 56000 },
        { color: C.soft, offset: 100000 },
      ],
    },
    line: { style: "solid", fill: "none", width: 0 },
  });
}

function txt(slide, text, position, style = {}) {
  const s = slide.shapes.add({
    geometry: "textbox",
    position,
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  s.text = text;
  s.text.style = {
    fontFace: "Aptos",
    fontSize: 22,
    color: C.ink,
    ...style,
  };
  return s;
}

function box(slide, position, options = {}) {
  return slide.shapes.add({
    geometry: options.geometry ?? "roundRect",
    position,
    fill: options.fill ?? C.paper,
    line: { style: "solid", fill: options.line ?? C.line, width: options.width ?? 1 },
    borderRadius: options.radius ?? "rounded-2xl",
    shadow: options.shadow ?? "shadow-sm",
  });
}

function note(slide, lines) {
  slide.speakerNotes.textFrame.setText(["[Sources]", ...lines]);
}

function logo(slide, x, y, size = 48, dark = true) {
  box(slide, { left: x, top: y, width: size, height: size }, {
    fill: dark ? C.ink : C.paper,
    line: dark ? C.ink : C.line,
    radius: "rounded-xl",
    shadow: "none",
  });
  txt(slide, "T", { left: x, top: y + size * 0.18, width: size, height: size * 0.55 }, {
    fontSize: size * 0.45,
    bold: true,
    color: dark ? "#FFFFFF" : C.ink,
    alignment: "center",
  });
}

function footer(slide, n) {
  txt(slide, "TRACE — Trusted Recipient Arc Claim Escrow", { left: 72, top: 674, width: 520, height: 20 }, {
    fontSize: 12,
    color: C.muted,
  });
  txt(slide, String(n).padStart(2, "0"), { left: 1150, top: 674, width: 58, height: 20 }, {
    fontSize: 12,
    bold: true,
    color: C.ink,
    alignment: "right",
  });
}

function header(slide, eyebrow, title, subtitle) {
  txt(slide, eyebrow, { left: 72, top: 42, width: 460, height: 24 }, {
    fontSize: 12,
    bold: true,
    color: C.muted,
  });
  txt(slide, title, { left: 72, top: 112, width: 980, height: 92 }, {
    fontSize: 42,
    bold: true,
    color: C.ink,
  });
  if (subtitle) {
    txt(slide, subtitle, { left: 72, top: 210, width: 800, height: 52 }, {
      fontSize: 19,
      color: C.muted,
    });
  }
}

function pill(slide, text, x, y, w, fill = C.paper, color = C.ink) {
  box(slide, { left: x, top: y, width: w, height: 34 }, {
    fill,
    line: C.line,
    radius: "rounded-full",
    shadow: "none",
  });
  txt(slide, text, { left: x + 14, top: y + 8, width: w - 28, height: 18 }, {
    fontSize: 12,
    bold: true,
    color,
    alignment: "center",
  });
}

function card(slide, title, body, x, y, w, h = 128, dark = false) {
  box(slide, { left: x, top: y, width: w, height: h }, {
    fill: dark ? C.ink : C.paper,
    line: dark ? C.ink : C.line,
  });
  txt(slide, title, { left: x + 22, top: y + 22, width: w - 44, height: 32 }, {
    fontSize: 22,
    bold: true,
    color: dark ? "#FFFFFF" : C.ink,
  });
  txt(slide, body, { left: x + 22, top: y + 62, width: w - 44, height: h - 72 }, {
    fontSize: 16,
    color: dark ? "#D7D3E4" : C.muted,
  });
}

function stat(slide, value, label, x, y, w, accent = C.ink) {
  box(slide, { left: x, top: y, width: w, height: 132 }, { fill: C.paper, line: C.line });
  txt(slide, value, { left: x + 18, top: y + 26, width: w - 36, height: 42 }, {
    fontSize: 36,
    bold: true,
    color: accent,
    alignment: "center",
  });
  txt(slide, label, { left: x + 22, top: y + 78, width: w - 44, height: 34 }, {
    fontSize: 15,
    color: C.muted,
    alignment: "center",
  });
}

async function build() {
  const deck = Presentation.create({ slideSize: { width: W, height: H } });

  // 1 strengthened cover
  {
    const s = deck.slides.add();
    bg(s);
    logo(s, 72, 66, 52);
    txt(s, "TRACE", { left: 140, top: 70, width: 240, height: 42 }, { fontSize: 30, bold: true });
    txt(s, "DeFi Track / Arc + USDC", { left: 72, top: 154, width: 360, height: 24 }, { fontSize: 14, bold: true, color: C.muted });
    txt(s, "Send USDC to an X identity. Claim with proof.", { left: 72, top: 210, width: 720, height: 150 }, {
      fontSize: 58,
      bold: true,
      color: C.ink,
    });
    txt(s, "Non-custodial escrow for recipients whose wallet address is not known yet.", { left: 76, top: 384, width: 620, height: 58 }, {
      fontSize: 22,
      color: C.muted,
    });
    pill(s, "X OAuth", 72, 474, 118);
    pill(s, "Wallet proof", 206, 474, 148);
    pill(s, "Arc escrow", 370, 474, 132);
    pill(s, "USDC claim", 518, 474, 132);

    box(s, { left: 790, top: 112, width: 360, height: 450 }, { fill: C.ink, line: C.ink });
    txt(s, "LIVE ROUTE", { left: 832, top: 154, width: 180, height: 22 }, { fontSize: 13, bold: true, color: "#898494" });
    txt(s, "@recipient", { left: 832, top: 210, width: 170, height: 32 }, { fontSize: 26, bold: true, color: "#FFFFFF" });
    txt(s, "wallet unknown", { left: 832, top: 246, width: 170, height: 24 }, { fontSize: 16, color: "#AFAABC" });
    txt(s, "→", { left: 940, top: 300, width: 60, height: 42 }, { fontSize: 38, bold: true, color: "#FFFFFF", alignment: "center" });
    logo(s, 932, 360, 68, false);
    txt(s, "Arc escrow", { left: 858, top: 446, width: 220, height: 30 }, { fontSize: 24, bold: true, color: "#FFFFFF", alignment: "center" });
    txt(s, "37/37 tests · chain 5042002", { left: 830, top: 502, width: 280, height: 24 }, { fontSize: 15, color: "#C9C5D8", alignment: "center" });
    footer(s, 1);
    note(s, ["Local TRACE project name, DeFi track positioning and current testnet evidence."]);
  }

  // 2
  {
    const s = deck.slides.add();
    bg(s);
    header(s, "PROBLEM", "Stablecoin payments still depend on wallet addresses", "Coordination happens through social identity; settlement still asks for a wallet first.");
    card(s, "Payout stalls", "The sender cannot act until the recipient shares a wallet address.", 92, 330, 320);
    card(s, "Address risk", "Copy/paste errors and impersonation are hard to catch before sending.", 480, 330, 320, 128, true);
    card(s, "No recovery", "A direct transfer has no clean cancel or expiry path when context changes.", 868, 330, 320);
    txt(s, "TRACE starts from the identity the sender already knows.", { left: 190, top: 570, width: 900, height: 34 }, { fontSize: 25, bold: true, color: C.violet, alignment: "center" });
    footer(s, 2);
    note(s, ["Local TRACE product framing and UI flow."]);
  }

  // 3 new mechanics slide, no UX screenshot
  {
    const s = deck.slides.add();
    bg(s);
    header(s, "MECHANICS", "A claim is valid only when three facts match", "This replaces the UX screenshot with the core product logic judges need to understand.");
    card(s, "1. Identity lock", "Payment stores the intended X recipient; OAuth must prove the same account.", 88, 318, 340, 150);
    card(s, "2. Wallet binding", "Recipient signs a one-time challenge to link the destination wallet.", 470, 318, 340, 150, true);
    card(s, "3. Claim digest", "Authorization binds payment, wallet, chain, contract and expiry.", 852, 318, 340, 150);
    box(s, { left: 154, top: 532, width: 972, height: 64 }, { fill: C.paper, line: C.line, radius: "rounded-xl" });
    txt(s, "Invariant: the database can index state, but only verified Arc transactions settle USDC.", { left: 190, top: 552, width: 900, height: 24 }, {
      fontSize: 21,
      bold: true,
      color: C.violet,
      alignment: "center",
    });
    footer(s, 3);
    note(s, ["Local TRACE security model: OAuth proof, wallet challenge and claim digest."]);
  }

  // 4
  {
    const s = deck.slides.add();
    bg(s);
    header(s, "SOLUTION", "TRACE separates intent, custody and claim", "The sender can act immediately while settlement waits for proof.");
    card(s, "X identity", "Recipient is addressed by a known public handle.", 80, 326, 245);
    card(s, "Arc escrow", "USDC custody sits in the contract lifecycle.", 365, 326, 245, 128, true);
    card(s, "Wallet proof", "Recipient signs a wallet challenge after OAuth.", 650, 326, 245);
    card(s, "Settlement", "Claim, cancel or refund closes the route.", 935, 326, 245);
    txt(s, "The backend indexes state; verified Arc transactions settle funds.", { left: 180, top: 560, width: 920, height: 32 }, { fontSize: 23, bold: true, color: C.violet, alignment: "center" });
    footer(s, 4);
    note(s, ["Local TRACE architecture and contract lifecycle."]);
  }

  // 5
  {
    const s = deck.slides.add();
    bg(s);
    header(s, "WHY TRACE", "It is a claim lifecycle, not just address lookup", "The moat is recoverable, proof-bound USDC settlement.");
    const rows = [
      ["Direct transfer", "Fast only when the address is known", "No identity claim / weak recovery"],
      ["Custodial handle pay", "Smooth UX", "Custody and platform risk"],
      ["TRACE", "Send now, prove later, recover if needed", "Non-custodial Arc escrow"],
    ];
    rows.forEach(([a, b, c], i) => {
      const y = 328 + i * 76;
      box(s, { left: 110, top: y, width: 1060, height: 56 }, { fill: i === 2 ? C.ink : C.paper, line: i === 2 ? C.ink : C.line, radius: "rounded-xl" });
      txt(s, a, { left: 138, top: y + 17, width: 230, height: 22 }, { fontSize: 17, bold: true, color: i === 2 ? "#FFFFFF" : C.ink });
      txt(s, b, { left: 410, top: y + 17, width: 410, height: 22 }, { fontSize: 16, color: i === 2 ? "#D8D4E8" : C.muted });
      txt(s, c, { left: 830, top: y + 17, width: 300, height: 22 }, { fontSize: 16, bold: i === 2, color: i === 2 ? "#FFFFFF" : C.muted });
    });
    footer(s, 5);
    note(s, ["Product-pattern comparison based on local TRACE design."]);
  }

  // 6
  {
    const s = deck.slides.add();
    bg(s);
    header(s, "ARC + USDC", "The DeFi primitive is programmable stablecoin settlement", "TRACE uses stablecoin custody, policy and recovery as the product core.");
    card(s, "Arc", "Execution layer and testnet settlement path.", 108, 330, 240);
    card(s, "USDC", "Principal, claim asset and fee unit.", 390, 330, 240, 128, true);
    card(s, "Policy", "Identity-bound claim, cancel and expiry.", 672, 330, 240);
    card(s, "Treasury", "Onchain fee routing while principal remains recoverable.", 954, 330, 240);
    footer(s, 6);
    note(s, ["Local TRACE implementation: Arc testnet, USDC escrow and fee model."]);
  }

  // 7
  {
    const s = deck.slides.add();
    bg(s);
    header(s, "SECURITY", "Claims require identity, wallet and digest agreement", "The product should fail closed when proof or chain state is missing.");
    const items = [
      ["Recipient proof", "X OAuth must match immutable recipient user ID."],
      ["Wallet proof", "Signed challenge binds the destination wallet."],
      ["Claim digest", "Payment, wallet, chain, contract and expiry are bound."],
      ["Recovery", "Cancel/refund remains available under policy."],
      ["Privacy", "Unauthorized API views omit sensitive payment details."],
      ["Gap", "External review and role separation remain required."],
    ];
    items.forEach(([a, b], i) => {
      const x = i % 2 === 0 ? 108 : 656;
      const y = 300 + Math.floor(i / 2) * 88;
      box(s, { left: x, top: y, width: 516, height: 66 }, { fill: i === 5 ? C.soft : C.paper, line: C.line, radius: "rounded-xl" });
      txt(s, a, { left: x + 22, top: y + 16, width: 160, height: 22 }, { fontSize: 18, bold: true });
      txt(s, b, { left: x + 200, top: y + 13, width: 286, height: 38 }, { fontSize: 15.5, color: C.muted });
    });
    footer(s, 7);
    note(s, ["Local TRACE security model and known production gaps."]);
  }

  // 8
  {
    const s = deck.slides.add();
    bg(s);
    header(s, "EVIDENCE", "The working proof is already testable", "Keep the proof large; long transaction hashes belong in README/explorer links.");
    stat(s, "37 / 37", "automated tests passing", 92, 316, 244, C.ink);
    stat(s, "5042002", "Arc Testnet chain ID", 382, 316, 244, C.violet);
    stat(s, "0.50%", "minimum protocol fee", 672, 316, 244, C.ink);
    stat(s, "3 flows", "claim, cancel, refund smoke", 962, 316, 244, C.violet);
    box(s, { left: 148, top: 518, width: 984, height: 62 }, { fill: C.paper, line: C.line, radius: "rounded-xl" });
    txt(s, "Contract: 0x5A3949aE67a37e7e37bFC77F5b7832Cc93f40A2a", { left: 184, top: 539, width: 920, height: 22 }, { fontSize: 18, color: C.ink });
    footer(s, 8);
    note(s, ["Local TRACE test and deployment evidence."]);
  }

  // 9
  {
    const s = deck.slides.add();
    bg(s);
    header(s, "READINESS", "Ready for demo; honest about hardening", "This should be presented as a testnet pilot, not a production launch.");
    card(s, "Ready now", "Deployment, lifecycle evidence and tests.", 110, 330, 320);
    card(s, "Main risks", "X API dependency and role/key custody.", 480, 330, 320, 128, true);
    card(s, "Before users", "HTTPS, managed DB, E2E, external review.", 850, 330, 320);
    txt(s, "Honest positioning is stronger than pretending production readiness.", { left: 190, top: 570, width: 900, height: 30 }, { fontSize: 22, bold: true, alignment: "center", color: C.violet });
    footer(s, 9);
    note(s, ["Local readiness assessment from current project state."]);
  }

  // 10
  {
    const s = deck.slides.add();
    bg(s);
    header(s, "ASK", "Help turn the proof into a public Arc testnet pilot", "The immediate milestone is packaging and verification.");
    card(s, "Feedback", "Arc/Circle fit, security model and DeFi-track positioning.", 110, 328, 320);
    card(s, "Public proof", "HTTPS demo, CI, explorer links and release tag.", 480, 328, 320, 128, true);
    card(s, "Hardening", "Two-account X E2E, role separation and external review.", 850, 328, 320);
    txt(s, "TRACE is focused: send USDC to an identity now, settle to a verified wallet later.", { left: 150, top: 572, width: 980, height: 34 }, { fontSize: 23, bold: true, alignment: "center", color: C.ink });
    footer(s, 10);
    note(s, ["Local roadmap and current submission goals."]);
  }

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.mkdir(PREVIEW_DIR, { recursive: true });
  for (const [index, slide] of deck.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    await writeBlob(path.join(PREVIEW_DIR, `${stem}.png`), await deck.export({ slide, format: "png", scale: 1 }));
    await fs.writeFile(path.join(PREVIEW_DIR, `${stem}.layout.json`), await (await slide.export({ format: "layout" })).text());
  }
  await writeBlob(path.join(PREVIEW_DIR, "deck-montage.webp"), await deck.export({ format: "webp", montage: true, scale: 1 }));
  const pptx = await PresentationFile.exportPptx(deck);
  await pptx.save(OUT);
  console.log(OUT);
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
