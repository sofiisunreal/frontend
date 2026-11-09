import { Fragment } from "react";

// Only local, supplied Markdown emphasis and plain links are supported. There is
// no HTML interpreter and no connection to official acceptance fingerprints.
function InlineText({ text }) {
  const tokens = text.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s]+|[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}| {2}\n)/g);
  return tokens.map((token, index) => {
    if (/^ {2}\n$/.test(token)) return <br key={index} />;
    if (token.startsWith("**") && token.endsWith("**")) return <strong key={index}><InlineText text={token.slice(2, -2)} /></strong>;
    if (/^https?:\/\//.test(token)) {
      const href = token.replace(/[.,;:!?)]*$/, "");
      return <Fragment key={index}><a href={href} target="_blank" rel="noreferrer">{href}</a>{token.slice(href.length)}</Fragment>;
    }
    if (/^[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(token)) return <a key={index} href={`mailto:${token}`}>{token}</a>;
    return token;
  });
}

export default function ProposedPolicySections({ draft }) {
  return <div className="legal-proposed-sections">{draft.sections.map((section, index) => <section key={section.number} aria-labelledby={`legal-section-${index + 1}`}><span className="legal-section-number" aria-hidden="true">{String(section.number).padStart(2, "0")}</span><div><h2 id={`legal-section-${index + 1}`}>{section.heading}</h2>{section.blocks.map((block, blockIndex) => block.type === "subheading" ? <h3 key={blockIndex}><InlineText text={block.text} /></h3> : block.type === "list" ? <ul key={blockIndex}>{block.items.map((item, itemIndex) => <li key={itemIndex}><InlineText text={item} /></li>)}</ul> : <p key={blockIndex}><InlineText text={block.text} /></p>)}</div></section>)}</div>;
}
