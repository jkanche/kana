!function(){"use strict";var t={8653:function(t,e,n){var r=n(3515),i=n(519),a=(n(9288),n(1305),n(6301),n(8333),n(9586),n(944),n(4657),n(5026),n(8538),n(1620));n(8840);var o=n(5671),s=n(3144),u=function(){function t(e,n){(0,o.Z)(this,t),this.status=e,this.coordinates=n}return(0,s.Z)(t,[{key:"clone",value:function(){return new t(this.status.deepcopy(),this.coordinates.clone())}},{key:"numberOfCells",value:function(){return this.status.num_obs()}},{key:"currentEpoch",value:function(){return this.status.epoch()}},{key:"totalEpochs",value:function(){return this.status.num_epochs()}},{key:"extractCoordinates",value:function(){return i.ab(this.numberOfCells(),this.coordinates.array())}},{key:"free",value:function(){null!==this.status&&(this.status.delete(),this.status=null),null!==this.coordinates&&(this.coordinates.free(),this.coordinates=null)}}]),t}();function c(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},n=e.runTime,i=void 0===n?null:n;null===i&&(i=-1),r.RE((function(e){return e.run_umap(t.status,i,t.coordinates.offset)}))}n(552),n(5767),n(5325);var f=n(7762),l=n(3324);n(6737);function d(t){if(void 0!==t&&null!==t)try{t.free()}catch(e){}}function h(t,e){return JSON.stringify(t)!=JSON.stringify(e)}function p(t,e){if(Array.isArray(t)){var n,r=(0,f.Z)(t);try{for(r.s();!(n=r.n()).done;){p(n.value,e)}}catch(s){r.e(s)}finally{r.f()}}else if(t.constructor==Object)for(var i=0,a=Object.entries(t);i<a.length;i++){var o=(0,l.Z)(a[i],2);o[0];p(o[1],e)}else if(ArrayBuffer.isView(t)){if(!(t.buffer instanceof ArrayBuffer))throw"only ArrayBuffers should be in the message payload";e.push(t.buffer)}}var v,y={},m=!1,b={},g={};function O(t){var e=function(t){return t?75:1e6}(t),n=y.init.clone();try{for(y.total=n.totalEpochs();n.currentEpoch()<y.total;)if(c(n,{runTime:e}),t){var r=n.extractCoordinates();postMessage({type:"umap_iter",x:r.x,y:r.y,iteration:n.currentEpoch()},[r.x.buffer,r.y.buffer])}y.final=n.extractCoordinates()}finally{n.free()}}onmessage=function(t){var e=t.data.id;"INIT"==t.data.cmd?(v=r.j2({numberOfThreads:1})).then((function(t){postMessage({id:e,type:"init_worker",data:{status:"SUCCESS"}})})).catch((function(t){postMessage({id:e,type:"error",error:t})})):"RUN"==t.data.cmd?v.then((function(n){var o;"neighbors"in t.data?(d(y.neighbors),y.neighbors=function(t){var e=null,n=null,r=null,o=null;try{var s=t.num_obs,u=t.size;(n=i.Wf(s)).set(t.runs),(r=i.Wf(u)).set(t.indices),(o=i.RJ(u)).set(t.distances),e=a.Tz.unserialize(n,r,o)}finally{null!==n&&n.free(),null!==r&&r.free(),null!==o&&o.free()}return e}(t.data.neighbors),o=!0):o=!1;var s={min_dist:t.data.params.min_dist,num_epochs:t.data.params.num_epochs};o||h(s,b)?(d(y.init),y.init=function(t){var e,n,o,s,c=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},f=c.neighbors,l=void 0===f?15:f,d=c.epochs,h=void 0===d?500:d,p=c.minDist,v=void 0===p?.01:p;try{var y;t instanceof a.DV?(e=(0,a.wf)(t,l),y=e):y=t,o=i.RJ(2*y.numberOfCells()),n=r.RE((function(t){return t.initialize_umap(y.results,h,v,o.offset)})),s=new u(n,o)}catch(m){throw i.gd(n),i.gd(o),m}finally{i.gd(e)}return s}(y.neighbors,{epochs:s.num_epochs,minDist:s.min_dist}),b=s,m=!0):m=!1;var c={};(m||h(c,g))&&(O(t.data.params.animate),g=c),postMessage({id:e,type:"umap_run",data:{status:"SUCCESS"}})})).catch((function(t){postMessage({id:e,type:"error",error:t})})):"RERUN"==t.data.cmd?v.then((function(t){O(!0),postMessage({id:e,type:"umap_rerun",data:{status:"SUCCESS"}})})).catch((function(t){postMessage({id:e,type:"error",error:t})})):"FETCH"==t.data.cmd&&v.then((function(t){var n={x:y.final.x.slice(),y:y.final.y.slice(),iterations:y.total},r=[];p(n,r),postMessage({id:e,type:"umap_fetch",data:n},r)})).catch((function(t){postMessage({id:e,type:"error",error:t})}))}}},e={};function n(r){var i=e[r];if(void 0!==i)return i.exports;var a=e[r]={exports:{}};return t[r](a,a.exports,n),a.exports}n.m=t,n.x=function(){var t=n.O(void 0,[5,705],(function(){return n(8653)}));return t=n.O(t)},function(){var t=[];n.O=function(e,r,i,a){if(!r){var o=1/0;for(f=0;f<t.length;f++){r=t[f][0],i=t[f][1],a=t[f][2];for(var s=!0,u=0;u<r.length;u++)(!1&a||o>=a)&&Object.keys(n.O).every((function(t){return n.O[t](r[u])}))?r.splice(u--,1):(s=!1,a<o&&(o=a));if(s){t.splice(f--,1);var c=i();void 0!==c&&(e=c)}}return e}a=a||0;for(var f=t.length;f>0&&t[f-1][2]>a;f--)t[f]=t[f-1];t[f]=[r,i,a]}}(),n.d=function(t,e){for(var r in e)n.o(e,r)&&!n.o(t,r)&&Object.defineProperty(t,r,{enumerable:!0,get:e[r]})},n.f={},n.e=function(t){return Promise.all(Object.keys(n.f).reduce((function(e,r){return n.f[r](t,e),e}),[]))},n.u=function(t){return"static/js/"+t+"."+{5:"b33c5a86",495:"6e174be4",705:"1f65a507"}[t]+".chunk.js"},n.miniCssF=function(t){},n.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},n.p="/kana/",function(){n.b=self.location+"/../../../";var t={653:1};n.f.i=function(e,r){t[e]||importScripts(n.p+n.u(e))};var e=self.webpackChunkkana=self.webpackChunkkana||[],r=e.push.bind(e);e.push=function(e){var i=e[0],a=e[1],o=e[2];for(var s in a)n.o(a,s)&&(n.m[s]=a[s]);for(o&&o(n);i.length;)t[i.pop()]=1;r(e)}}(),function(){var t=n.x;n.x=function(){return Promise.all([n.e(5),n.e(705)]).then(t)}}();n.x()}();
//# sourceMappingURL=653.2b6f1043.chunk.js.map