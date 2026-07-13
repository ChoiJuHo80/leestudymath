const fs = require('fs');
let code = fs.readFileSync('main.js', 'utf8');

// Change outer item container
const oldOuter = `                const item = document.createElement('div');
                item.style.display = 'flex';
                item.style.overflow = 'hidden';
                item.style.justifyContent = 'space-between';
                item.style.alignItems = 'center';
                item.style.padding = '12px 18px';`;
const newOuter = `                const item = document.createElement('div');
                item.style.display = 'flex';
                item.style.flexDirection = 'column';
                item.style.gap = '12px';
                item.style.overflow = 'hidden';
                item.style.padding = '14px 18px';`;
code = code.replace(oldOuter, newOuter);

// Fix "isSpecial" innerHTML
const oldInnerSpecial = `<div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; overflow: hidden;">
                            <span style="font-size: 0.72rem; color: var(--mascot-purple-bg); background: #ffffff; padding: 2.5px 8px; border-radius: 20px; font-weight: 800; display: inline-flex; align-items: center; gap: 2px; white-space: nowrap; flex-shrink: 0;">
                                🌟 대표
                            </span>
                            <span style="font-weight: 800; font-size: 0.95rem; color: #ffffff; letter-spacing: -0.3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; flex: 1;">\${set.title}</span>
                            <span style="font-size: 0.78rem; color: rgba(255,255,255,0.85); background: rgba(255,255,255,0.15); padding: 1px 6px; border-radius: 4px; white-space: nowrap; flex-shrink: 0;">\${set.words.length} 카드</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;" class="vocab-action-area">`;
const newInnerSpecial = `<div style="display: flex; align-items: flex-start; gap: 8px; width: 100%;">
                            <span style="font-size: 0.72rem; color: var(--mascot-purple-bg); background: #ffffff; padding: 2.5px 8px; border-radius: 20px; font-weight: 800; display: inline-flex; align-items: center; gap: 2px; white-space: nowrap; flex-shrink: 0; margin-top: 2px;">
                                🌟 대표
                            </span>
                            <span style="font-weight: 800; font-size: 0.95rem; color: #ffffff; letter-spacing: -0.3px; word-break: keep-all; line-height: 1.4; flex: 1;">\${set.title}</span>
                            <span style="font-size: 0.78rem; color: rgba(255,255,255,0.85); background: rgba(255,255,255,0.15); padding: 1px 6px; border-radius: 4px; white-space: nowrap; flex-shrink: 0; margin-top: 2px;">\${set.words.length} 카드</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; width: 100%; flex-wrap: wrap;" class="vocab-action-area">`;
code = code.replace(oldInnerSpecial, newInnerSpecial);

// Fix "normal" innerHTML
const oldInnerNormal = `<div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; overflow: hidden;">
                            <span style="font-size: 0.72rem; color: #ffffff; background: \${isPersonal ? 'var(--mascot-purple-bg)' : '#82b444'}; padding: 2px 6px; border-radius: 4px; font-weight: 700; white-space: nowrap; flex-shrink: 0;">
                                \${isPersonal ? '나만의' : '클래스'}
                            </span>
                            <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; flex: 1;">\${set.title}</span>
                            <span style="font-size: 0.78rem; color: var(--text-secondary); white-space: nowrap; flex-shrink: 0;">\${set.words.length} 카드</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;" class="vocab-action-area">`;
const newInnerNormal = `<div style="display: flex; align-items: flex-start; gap: 8px; width: 100%;">
                            <span style="font-size: 0.72rem; color: #ffffff; background: \${isPersonal ? 'var(--mascot-purple-bg)' : '#82b444'}; padding: 2px 6px; border-radius: 4px; font-weight: 700; white-space: nowrap; flex-shrink: 0; margin-top: 2px;">
                                \${isPersonal ? '나만의' : '클래스'}
                            </span>
                            <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary); word-break: keep-all; line-height: 1.4; flex: 1;">\${set.title}</span>
                            <span style="font-size: 0.78rem; color: var(--text-secondary); white-space: nowrap; flex-shrink: 0; margin-top: 2px;">\${set.words.length} 카드</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; width: 100%; flex-wrap: wrap;" class="vocab-action-area">`;
code = code.replace(oldInnerNormal, newInnerNormal);

fs.writeFileSync('main.js', code);
console.log("Mobile responsive vocab cards applied!");
