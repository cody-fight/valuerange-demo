import test from 'node:test';
import assert from 'node:assert/strict';
import {createWalletConnection} from '../dist/wallet.mjs';
test('wallet connection follows approval, account changes and disconnection',async()=>{
 const events={};const provider={isPhantom:true,on:(k,f)=>events[k]=f,removeListener:k=>delete events[k],connect:async()=>({publicKey:'address-one'}),disconnect:async()=>events.disconnect?.()};
 const wallet=createWalletConnection();await wallet.connect(provider);assert.equal(wallet.state.address,'address-one');events.accountChanged('address-two');assert.equal(wallet.state.address,'address-two');events.accountChanged(null);assert.equal(wallet.state.address,'');await wallet.connect(provider);await wallet.disconnect();assert.equal(wallet.state.address,'');assert.deepEqual(events,{});
});
test('rejection never produces a connected address and pending requests are deduplicated',async()=>{
 const wallet=createWalletConnection();await wallet.connect({isPhantom:true,connect:async()=>{throw {code:4001};}});assert.equal(wallet.state.error,'rejected');assert.equal(wallet.state.address,'');
 let complete,calls=0;const provider={isPhantom:true,connect:()=>{calls++;return new Promise(r=>complete=r);}};
 const pending=wallet.connect(provider);await wallet.connect(provider);assert.equal(calls,1);complete({publicKey:'approved'});await pending;assert.equal(wallet.state.address,'approved');assert.equal(wallet.state.busy,false);
});
