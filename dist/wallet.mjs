import {getLanguage} from './locales/locale.mjs';
const t=(en,zh)=>getLanguage()==='en'?en:zh;
export function createWalletConnection(onChange=()=>{}){
 const state={address:'',busy:false,error:''};let provider;
 const address=key=>key?.toString?.()||'';
 const disconnected=()=>{state.address='';onChange();};
 const changed=key=>{state.address=address(key);onChange();};
 function detach(){provider?.removeListener?.('disconnect',disconnected);provider?.removeListener?.('accountChanged',changed);}
 return {state,async connect(next){if(state.busy)return;state.busy=true;state.error='';onChange();try{if(!next?.isPhantom)throw Error('unavailable');detach();provider=next;provider.on?.('disconnect',disconnected);provider.on?.('accountChanged',changed);const result=await provider.connect();state.address=address(result?.publicKey||provider.publicKey);if(!state.address)throw Error('no-account');}catch(e){state.address='';state.error=e.code===4001?'rejected':'failed';detach();}finally{state.busy=false;onChange();}},async disconnect(){if(state.busy)return;state.busy=true;onChange();try{await provider?.disconnect();detach();state.address='';state.error='';}catch{state.error='disconnect';}finally{state.busy=false;onChange();}}};
}
let dialog;
const connection=createWalletConnection(()=>{renderWalletButton();if(dialog?.open)renderDialog();});
export function renderWalletButton(){
 document.querySelector('.vr-wallet-button')?.remove();
 const b=document.createElement('button');b.className='vr-wallet-button';b.dataset.wallet='open';
 b.textContent=connection.state.address?connection.state.address.slice(0,4)+'…'+connection.state.address.slice(-4):t('Connect wallet','连接钱包');
 b.setAttribute('aria-haspopup','dialog');document.querySelector('.top-meta')?.prepend(b);
}
function renderDialog(){
 const {address,busy,error}=connection.state,installed=!!window.phantom?.solana?.isPhantom;
 dialog.innerHTML=`<div class="vr-dialog-body"><button class="vr-close" data-wallet="close" aria-label="${t('Close','关闭')}">×</button><span class="vr-eyebrow">SOLANA WALLET</span><h2 id="vr-wallet-title">${address?t('Wallet connected','钱包已连接'):t('Connect your wallet','连接你的钱包')}</h2><p>${t('Connect to display your Solana address. Deposits remain simulated.','连接后展示你的 Solana 地址。存入操作仍为模拟体验。')}</p><div class="vr-wallet-address"></div>${address?`<button class="vr-primary" data-wallet="disconnect" ${busy?'disabled':''}>${t('Disconnect','断开连接')}</button>`:installed?`<button class="vr-primary" data-wallet="connect" ${busy?'disabled':''}>${busy?t('Approve in Phantom…','请在 Phantom 中确认…'):t('Connect Phantom','连接 Phantom')} ↗</button>`:`<p>${t('Phantom was not detected in this browser. Open this page in Chrome, Brave or Edge with the Phantom extension enabled, then connect. Embedded preview browsers generally cannot access browser extensions.','当前浏览器未检测到 Phantom。请在安装并启用 Phantom 扩展的 Chrome、Brave 或 Edge 中打开此页面，再点击连接。内置预览浏览器通常无法唤起浏览器扩展。')}</p><a href="https://phantom.com/download" target="_blank" rel="noopener noreferrer">${t('Get Phantom','获取 Phantom')} ↗</a><button class="vr-primary" data-wallet="retry">${t('Check for wallet again','重新检测钱包')}</button><p>${t('This preview runs on your computer. Use the same computer to open its localhost address.','当前为本机预览，请在同一台电脑上打开此 localhost 地址。')}</p>`}<p class="vr-error" role="status">${error?t(error==='rejected'?'Connection cancelled. Try again when ready.':error==='disconnect'?'Could not disconnect. Please try again.':'Unable to connect. Unlock your wallet and try again.',error==='rejected'?'已取消连接，可重新尝试。':error==='disconnect'?'断开失败，请重试。':'连接失败，请解锁钱包后重试。'):''}</p></div>`;
 dialog.querySelector('.vr-wallet-address').textContent=address;
}
export function initWallet(){
 dialog=document.createElement('dialog');dialog.className='vr-dialog';dialog.id='wallet-dialog';dialog.setAttribute('aria-labelledby','vr-wallet-title');document.body.append(dialog);
 dialog.addEventListener('close',()=>{document.querySelector('.vr-wallet-button')?.focus();});
 document.addEventListener('click',async e=>{const action=e.target.closest('[data-wallet]')?.dataset.wallet;if(!action)return;
 if(action==='open'){renderDialog();dialog.showModal();if(!connection.state.address&&window.phantom?.solana?.isPhantom)await connection.connect(window.phantom.solana);}
 if(action==='retry'){renderDialog();if(window.phantom?.solana?.isPhantom)await connection.connect(window.phantom.solana);}
 if(action==='close')dialog.close();
 if(action==='connect')await connection.connect(window.phantom?.solana);
 if(action==='disconnect')await connection.disconnect();
 });
}
