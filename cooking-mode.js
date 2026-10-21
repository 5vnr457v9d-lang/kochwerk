/** Screen Wake Lock lifecycle. No recipe writes and no persistent preference. */
export function createCookingMode({wakeLock,secure=true,visible=true,onChange=()=>{}}={}) {
  const supported=secure&&typeof wakeLock?.request==='function';
  let enabled=false,lock=null,phase=supported?'off':'unsupported';
  let running=false,rerun=false,task=Promise.resolve();
  const messages={
    off:'Beim Kochen den Bildschirm wach halten.',
    unsupported:'Bildschirm-Wachhalten wird in diesem Browser nicht unterstützt.',
    requesting:'Bildschirm-Wachhalten wird angefragt …',
    active:'Bildschirm bleibt an, solange Kochwerk sichtbar ist.',
    paused:'Bildschirm-Wachhalten pausiert.',
    released:'Wachhalten beendet. Zum erneuten Versuch in die App tippen.',
    error:'Wachhalten nicht aktiv. Zum erneuten Versuch in die App tippen.',
    releaseError:'Wachhalten konnte nicht beendet werden.'
  };
  function snapshot(){return {supported,enabled,active:!!lock&&!lock.released&&visible,phase,message:messages[phase]};}
  function notify(){onChange(snapshot());}
  function idlePhase(){return enabled?'paused':'off';}
  function reconcile(){
    rerun=true;
    if(running)return task;
    running=true;
    task=(async()=>{
      try{
        while(rerun){
          rerun=false;
          if(!enabled||!visible){
            if(lock&&!lock.released){
              const previous=lock;
              try{await previous.release();}
              catch{
                if(!previous.released){phase='releaseError';notify();continue;}
              }
              if(lock===previous)lock=null;
            }else lock=null;
            phase=idlePhase();notify();continue;
          }
          if(lock&&!lock.released){phase='active';notify();continue;}
          phase='requesting';notify();
          try{
            const next=await wakeLock.request('screen');
            lock=next;
            next.addEventListener('release',()=>{
              if(lock!==next)return;
              lock=null;
              phase=enabled?(visible?'released':'paused'):'off';
              notify();
            });
            // The user may have stopped or hidden the app while the request was pending.
            if(!enabled||!visible){rerun=true;continue;}
            if(next.released){lock=null;phase='released';}
            else phase='active';
            notify();
          }catch{
            phase=enabled&&visible?'error':idlePhase();notify();
          }
        }
      }finally{running=false;}
    })();
    return task;
  }
  return {
    get state(){return snapshot();},
    enable(){
      if(!supported){phase='unsupported';notify();return Promise.resolve();}
      enabled=true;return reconcile();
    },
    disable(){
      enabled=false;
      if(!supported)return Promise.resolve();
      if(!lock){phase='off';notify();}
      return reconcile();
    },
    retry(){return supported&&enabled?reconcile():Promise.resolve();},
    setVisible(value){
      visible=!!value;
      if(!supported)return Promise.resolve();
      if(!visible){phase=idlePhase();notify();}
      return reconcile();
    }
  };
}

/** One automatic request; user interaction and foreground return can retry it. */
export function createAutomaticCookingMode({now=()=>Date.now(),...options}={}) {
  const controller=createCookingMode(options);
  let visible=options.visible!==false,lastInteractionAttempt=-Infinity;
  const ready=controller.enable();
  return {
    get state(){return controller.state;},
    ready,
    setVisible(value){visible=!!value;return controller.setVisible(visible);},
    retryAfterInteraction(){
      const state=controller.state;
      if(!visible||!state.enabled||state.active||!['error','released'].includes(state.phase))return Promise.resolve();
      const timestamp=now();
      if(timestamp-lastInteractionAttempt<1000)return Promise.resolve();
      lastInteractionAttempt=timestamp;
      return controller.retry();
    }
  };
}

/** Connect real page lifecycle and completed taps. Call start after the initial render. */
export function connectCookingMode(mode,{document,window,afterPaint=callback=>window.requestAnimationFrame(()=>window.requestAnimationFrame(callback))}) {
  let started=false;
  const isVisible=()=>document.visibilityState==='visible';
  function sync(){if(started)void mode.setVisible(isVisible());}
  function interact(){
    if(!isVisible())return;
    // Stay in the input event's activation context: no timers or awaited work here.
    if(!started){started=true;void mode.setVisible(true);}
    else void mode.retryAfterInteraction();
  }
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('pageshow',sync);
  window.addEventListener('pagehide',()=>{if(started)void mode.setVisible(false);});
  document.addEventListener('click',interact,{capture:true,passive:true});
  document.addEventListener('keydown',interact,{capture:true});
  return {
    start(){afterPaint(()=>{if(started)return;started=true;sync();});}
  };
}
