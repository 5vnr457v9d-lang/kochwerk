const paths={
recipes:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 3v18M11 8h5M11 12h5"/>',
book:'<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Z"/><path d="M12 5v15"/>',
heart:'<path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z"/>',
settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor"/><circle cx="16" cy="17" r="3" fill="currentColor"/>',
search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
plus:'<path d="M12 4v16M4 12h16"/>',
arrow:'<path d="m9 5-7 7 7 7M3 12h19"/>',
edit:'<path d="m16 3 5 5-12 12-6 1 1-6L16 3ZM13 6l5 5"/>',
trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
print:'<path d="M6 8V2h12v6M6 17H3V8h18v9h-3M6 14h12v8H6zM17 11h1"/>',
close:'<path d="m5 5 14 14M5 19 19 5"/>',
download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
leaf:'<path d="M20 3C5 1 1 10 6 16s15 2 14-13ZM4 21 16 8"/>',
check:'<path d="m5 12 4 4L20 5"/>',
};
export const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]??paths.book}</svg>`;
export function cover(type='bread') {
  const images={
    bread:['#e9e2d2',`<ellipse cx="160" cy="145" rx="102" ry="15" fill="#cabda1" opacity=".4"/><path d="M57 125C51 58 111 36 170 41c63 5 108 45 92 88-29 33-166 33-205-4Z" fill="#b57943"/><path d="M66 117C67 65 119 44 171 49c44 4 82 31 84 66-20 32-156 31-189 2Z" fill="#dba664"/><path d="M94 104c7-24 25-34 32-36M131 114c6-27 26-45 33-48M174 120c1-24 16-42 21-45M213 118c0-16 3-25 6-29" stroke="#f3d2a0" stroke-width="10" stroke-linecap="round"/><path d="M76 117c30 22 126 31 169-2" fill="none" stroke="#a96a39" stroke-width="2"/>`],
    cake:['#efe2d6',`<ellipse cx="160" cy="147" rx="98" ry="12" fill="#d6c4b4"/><ellipse cx="160" cy="143" rx="103" ry="9" fill="#fcf9ee"/><path d="m91 125 8-65 138 22-7 60Z" fill="#d8aa64"/><path d="m99 60 39-21 130 29-31 14Z" fill="#f7e9bc"/><path d="m237 82 31-14-9 59-29 15Z" fill="#c29554"/><path d="m99 60 138 22-4 12-135-24Z" fill="#fff3d4"/><path d="M114 81v20M135 86v8M158 92v22M182 93v16M209 97v24" stroke="#e8c27e" stroke-width="4" stroke-linecap="round"/><circle cx="72" cy="125" r="22" fill="#e8c54c"/><path d="M72 107v35m-15-25 29 16m-28 0 28-16" stroke="#fbec9d" stroke-width="2"/><path d="M63 97c-10-12-21-10-24-5 7 10 15 10 24 5Z" fill="#7b9063"/>`],
    pasta:['#e5e9df',`<ellipse cx="160" cy="102" rx="106" ry="64" fill="#d0d6c8"/><ellipse cx="160" cy="98" rx="106" ry="64" fill="#f9f8ed"/><ellipse cx="160" cy="99" rx="79" ry="44" fill="#e1c680"/><g fill="none" stroke="#c6924f" stroke-width="7" stroke-linecap="round"><path d="M103 85c80-46 128 63 19 23s105-21 49 16M107 105c-24-35 88-34 99 3M127 76c-28 36 75 71 92 17M105 117c46 22 58-66 94-27"/></g><g fill="#b56043"><ellipse cx="135" cy="92" rx="15" ry="10"/><ellipse cx="186" cy="113" rx="13" ry="10"/><ellipse cx="184" cy="79" rx="12" ry="9"/></g><g fill="#6d8958"><path d="M153 92c-25-27-35-13-27-2 7 9 18 8 27 2ZM156 92c15-28 32-22 26-8-4 9-13 10-26 8Z"/></g>`],
    generic:['#e3eadc',`<path d="M88 65c30-12 54-8 72 6 21-15 47-17 74-6v78c-26-10-51-6-74 9-22-15-47-19-72-9Z" fill="#fdfbf2" stroke="#8b9c7b" stroke-width="2"/><path d="M160 71v81M104 87l35 4m-35 14 35 4m-35 14 35 4m42-35 35-4m-35 22 35-4m-35 22 35-4" stroke="#b5bea4" stroke-width="2"/><path d="M151 31c-24-21-38-6-24 5 9 6 17 3 24-5Zm6 3c3-30 26-28 23-10-2 8-9 12-23 10Z" fill="#829b6a"/>`]
  };
  const [bg,art]=images[type]??images.generic;
  return `<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="320" height="180" fill="${bg}"/><circle cx="280" cy="20" r="70" fill="#ffffff" opacity=".17"/>${art}<g fill="#ffffff" opacity=".45"><circle cx="40" cy="50" r="2"/><circle cx="274" cy="140" r="2"/><circle cx="60" cy="150" r="1.5"/></g></svg>`;
}
export function recipeArt(r) {const s=r.title.toLocaleLowerCase('de');return cover(/brot|focaccia|brötchen|pizza/.test(s)?'bread':/kuchen|torte|gebäck|keks/.test(s)?'cake':/pasta|nudel|spaghetti/.test(s)?'pasta':'generic');}
