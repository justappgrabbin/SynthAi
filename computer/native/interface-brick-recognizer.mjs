const clone = value => value === undefined ? undefined : structuredClone(value);

const ROLE_RULES = Object.freeze([
  ['dialog', /dialog|popup|modal/i],
  ['toolbar', /toolbar|actionbar/i],
  ['tabs', /tablayout|tabbar|tabrow/i],
  ['webview', /webview/i],
  ['input', /edittext|textfield|textinput/i],
  ['button', /button|imagebutton|floatingactionbutton/i],
  ['switch', /switch|togglebutton|checkbox|radiobutton/i],
  ['slider', /seekbar|slider/i],
  ['list', /recyclerview|listview|gridview|collection/i],
  ['scroll', /scrollview|nestedscroll/i],
  ['image', /imageview|photo|thumbnail/i],
  ['text', /textview|label|heading/i],
]);

const BRICKS = Object.freeze({
  dialog:  { kind:'room',          symbol:'chamber', affordance:'enter' },
  toolbar: { kind:'counter',       symbol:'toolbench', affordance:'inspect' },
  tabs:    { kind:'door-row',      symbol:'thresholds', affordance:'choose' },
  webview: { kind:'district',      symbol:'district', affordance:'enter' },
  input:   { kind:'writing-desk',  symbol:'writing', affordance:'write' },
  button:  { kind:'control-plinth',symbol:'control', affordance:'activate' },
  link:    { kind:'door',          symbol:'door', affordance:'enter' },
  switch:  { kind:'lever',         symbol:'toggle', affordance:'toggle' },
  slider:  { kind:'dial',          symbol:'dial', affordance:'adjust' },
  list:    { kind:'shelf-wall',    symbol:'shelves', affordance:'browse' },
  scroll:  { kind:'corridor',      symbol:'path', affordance:'travel' },
  image:   { kind:'mural',         symbol:'image', affordance:'inspect' },
  text:    { kind:'sign',          symbol:'text', affordance:'read' },
  item:    { kind:'display-case',  symbol:'item', affordance:'inspect' },
  generic: { kind:'world-brick',   symbol:'brick', affordance:'inspect' },
});

function normalizedText(node = {}) {
  return [node.text,node.contentDescription,node.hintText,node.stateDescription,node.viewId,node.className]
    .filter(Boolean).join(' ').trim();
}

function roleFor(node = {}) {
  const explicit = String(node.role ?? '').toLowerCase().trim();
  if (explicit && BRICKS[explicit]) return explicit;
  if (node.editable) return 'input';
  if (node.checkable) return 'switch';
  if (node.scrollable) return 'scroll';
  if (node.clickable && /https?:|link|url|href/i.test(normalizedText(node))) return 'link';

  const className = String(node.className ?? '');
  for (const [role,re] of ROLE_RULES) if (re.test(className)) return role;

  if (node.clickable) return 'button';
  if (Array.isArray(node.children) && node.children.length > 1) return 'item';
  if (normalizedText(node)) return 'text';
  return 'generic';
}

function actionSet(node = {}, role = 'generic') {
  const actions = new Set((node.actions ?? []).map(value => String(value).toLowerCase()));
  if (node.clickable) actions.add('click');
  if (node.longClickable) actions.add('long-click');
  if (node.editable || role === 'input') actions.add('set-text');
  if (node.scrollable || role === 'scroll' || role === 'list') {
    actions.add('scroll-forward');
    actions.add('scroll-backward');
  }
  if (node.focusable) actions.add('focus');
  if (node.checkable || role === 'switch') actions.add('click');
  return [...actions].sort();
}

function worldAffordances(actions = [], role = 'generic') {
  const result = [];
  if (actions.includes('click')) result.push({id:role === 'link' ? 'enter' : role === 'switch' ? 'toggle' : 'activate', nativeAction:'click'});
  if (actions.includes('long-click')) result.push({id:'hold',nativeAction:'long-click'});
  if (actions.includes('set-text')) result.push({id:'write',nativeAction:'set-text',acceptsValue:true});
  if (actions.includes('scroll-forward')) result.push({id:'travel-forward',nativeAction:'scroll-forward'});
  if (actions.includes('scroll-backward')) result.push({id:'travel-backward',nativeAction:'scroll-backward'});
  if (actions.includes('focus')) result.push({id:'focus',nativeAction:'focus'});
  return result;
}

function safe(value) {
  return String(value ?? 'unknown').replace(/[^A-Za-z0-9._:-]/g,'_');
}

export class InterfaceBrickRecognizer {
  constructor({ id='legacy-interface-brick-recognizer', version=1 } = {}) {
    this.id=id;
    this.version=version;
  }

  recognize(snapshot = {}) {
    const packageName = String(snapshot.packageName ?? snapshot.package ?? 'unknown.package');
    const windowId = String(snapshot.windowId ?? 'active');
    const surfaceId = String(snapshot.surfaceId ?? `surface:${packageName}:${windowId}`);
    const bricks = [];

    const visit = (node, parentBrickId=null, depth=0, childIndex=0) => {
      if (!node || depth > 24 || bricks.length >= 1200) return null;
      const role = roleFor(node);
      const template = BRICKS[role] ?? BRICKS.generic;
      const path = String(node.path ?? (parentBrickId ? `${parentBrickId}/${childIndex}` : '0'));
      const nodeKey = String(node.nodeId ?? node.viewId ?? path);
      const brickId = `brick:${safe(packageName)}:${safe(windowId)}:${safe(nodeKey)}`;
      const nativeActions = actionSet(node,role);
      const label = String(node.text ?? node.contentDescription ?? node.hintText ?? node.viewId ?? role);

      const brick = {
        id:brickId,
        surfaceId,
        parentId:parentBrickId,
        depth,
        order:bricks.length,
        role,
        label,
        world:{
          kind:template.kind,
          function:role,
          presentation:{
            symbol:template.symbol,
            semanticRole:role,
          },
        },
        affordances:worldAffordances(nativeActions,role),
        state:{
          enabled:node.enabled !== false,
          checked:Boolean(node.checked),
          selected:Boolean(node.selected),
          focused:Boolean(node.focused),
          visible:node.visible !== false,
        },
        geometry:clone(node.bounds ?? null),
        binding:{
          packageName,
          windowId,
          nodeKey,
          path,
          viewId:node.viewId ?? null,
          className:node.className ?? null,
          nativeActions,
        },
        metadata:{
          contentDescription:node.contentDescription ?? null,
          hintText:node.hintText ?? null,
          stateDescription:node.stateDescription ?? null,
        },
      };
      bricks.push(brick);

      for (let i=0;i<(node.children ?? []).length;i++) visit(node.children[i],brickId,depth+1,i);
      return brickId;
    };

    const rootBrickId = visit(snapshot.root ?? snapshot.tree ?? snapshot, null, 0, 0);
    return {
      recognizer:this.id,
      version:this.version,
      surfaceId,
      packageName,
      windowId,
      title:snapshot.title ?? snapshot.windowTitle ?? packageName,
      rootBrickId,
      bricks,
      composition:{
        kind:'interface-building',
        brickCount:bricks.length,
        interactiveCount:bricks.filter(b=>b.affordances.length).length,
        structuralKinds:[...new Set(bricks.map(b=>b.world.kind))],
      },
      capturedAt:snapshot.capturedAt ?? null,
    };
  }
}

export default InterfaceBrickRecognizer;
