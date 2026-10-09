// SVG silhouettes keep resource colors consistent across fonts and platforms.
export function resourceIcon(kind,compact=false){
 const shape=kind==='pop'?'<circle cx="12" cy="4.5" r="3.3"/><path d="M8 9h8a2 2 0 0 1 2 2v6h-3v7h-3v-7h-1v7H8v-7H5v-6a2 2 0 0 1 2-2z"/>':'<path d="m12 1 3.2 7.8L23 12l-7.8 3.2L12 23l-3.2-7.8L1 12l7.8-3.2z"/>';
 return `<svg class="resource-icon resource-icon-${kind}" viewBox="${compact&&kind==='pop'?'5 0 14 24':'0 0 24 24'}" aria-hidden="true" focusable="false">${shape}</svg>`;
}
