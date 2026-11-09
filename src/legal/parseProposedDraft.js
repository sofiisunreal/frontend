// A deliberately small, non-HTML parser for the supplied local draft format.
// Official API documents keep their existing literal-text renderer and hashes.
export function parseProposedDraft(source) {
  const text = source.replace(/\r\n/g, "\n");
  const headings = [...text.matchAll(/^## (\d+\. .+)$/gm)];
  return {
    title: text.match(/^# (.+)$/m)?.[1] || "Budgetly legal document",
    source,
    sections: headings.map((match, index) => ({
      heading: match[1],
      number: Number.parseInt(match[1], 10),
      blocks: text.slice(match.index + match[0].length, headings[index + 1]?.index ?? text.length).trim().split(/\n\s*\n/).filter(Boolean).map(block => {
        if (block.startsWith("### ")) return { type: "subheading", text: block.slice(4) };
        if (block.split("\n").every(line => line.startsWith("- "))) return { type: "list", items: block.split("\n").map(line => line.slice(2)) };
        return { type: "paragraph", text: block };
      }),
    })),
  };
}
