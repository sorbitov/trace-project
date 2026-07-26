(async () => {
  const metricsRoot = document.querySelector("[data-project-metrics]");
  const documentsRoot = document.querySelector("[data-project-documents]");
  if (!metricsRoot && !documentsRoot) return;

  try {
    const response = await fetch("./data/project.json", { headers: { Accept: "application/json" } });
    if (!response.ok) return;
    const project = await response.json();

    if (metricsRoot && Array.isArray(project.metrics)) {
      metricsRoot.replaceChildren(...project.metrics.map((metric) => {
        const article = document.createElement("article");
        const label = document.createElement("span");
        const value = document.createElement("strong");
        const detail = document.createElement("small");
        label.textContent = metric.label;
        value.textContent = metric.value;
        detail.textContent = metric.detail;
        article.append(label, value, detail);
        return article;
      }));
    }

    if (documentsRoot && Array.isArray(project.documents)) {
      documentsRoot.replaceChildren(...project.documents.map((documentItem) => {
        const link = document.createElement("a");
        const number = document.createElement("span");
        const title = document.createElement("strong");
        const detail = document.createElement("small");
        const arrow = document.createElement("b");
        link.href = documentItem.href;
        number.textContent = documentItem.number;
        title.textContent = documentItem.title;
        detail.textContent = documentItem.detail;
        arrow.textContent = "↗";
        link.append(number, title, detail, arrow);
        return link;
      }));
    }
  } catch {
    // Static HTML remains the complete fallback for reviewers and crawlers.
  }
})();
