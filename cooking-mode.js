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
    paused:'Kochmodus pausiert, während Kochwerk im Hintergrund ist.',
    released:'Das Gerät hat das Wachhalten beendet. Automatischer neuer Versuch bei Rückkehr oder weiterer Bedienung.',
    error:'Bildschirm-Wachhalten derzeit nicht aktiv; ggf. Stromsparmodus prüfen. Neuer Versuch bei Rückkehr oder weiterer Bedienung.',
    releaseError:'Wachhalten konnte nicht beendet werden. Bitte nochmals ausschalten.'
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

/** Bounded retries cover pages that become fully active after their first request. */
export function createAutomaticCookingMode({now=()=>Date.now(),schedule=setTimeout,cancel=clearTimeout,...options}={}) {
  const controller=createCookingMode(options);
  let visible=options.visible!==false;
  let lastInteractionAttempt=-Infinity;
  const timers=new Set();
  function clearRetries(){for(const timer of timers)cancel(timer);timers.clear();}
  function retryIfNeeded(){
    const state=controller.state;
    return visible&&state.enabled&&!state.active&&['error','released'].includes(state.phase)
      ?controller.retry():Promise.resolve();
  }
  function scheduleRetries(){
    clearRetries();
    if(!visible||!controller.state.supported)return;
    for(const delay of [300,1200,3000]){
      const timer=schedule(()=>{timers.delete(timer);return retryIfNeeded();},delay);
      timers.add(timer);
    }
  }
  const ready=controller.enable();
  scheduleRetries();
  return {
    get state(){return controller.state;},
    ready,
    setVisible(value){
      visible=!!value;
      const task=controller.setVisible(visible);
      scheduleRetries();
      return task;
    },
    // load/focus can happen after the initial request, without any user input.
    refresh(){scheduleRetries();return retryIfNeeded();},
    retryAfterInteraction(){
      const state=controller.state;
      if(!visible||!state.enabled||state.active||!['error','released'].includes(state.phase))return Promise.resolve();
      const timestamp=now();
      if(timestamp-lastInteractionAttempt<10000)return Promise.resolve();
      lastInteractionAttempt=timestamp;
      return controller.retry();
    }
  };
}
