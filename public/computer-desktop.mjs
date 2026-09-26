// Desktop presentation adapter. The Computer runtime and its existing controls stay authoritative.
const $ = selector => document.querySelector(selector);
const desktopList = $('#desktopFileList');
const picker = $('#projectPicker');
const sourceFiles = $('#fileList');
const menu = $('#windowMenu');

function projectName() {
  return picker.selectedOptions[0]?.value ? picker.selectedOptions[0].textContent.split(' · ')[0] : '';
}

function renderDesktop() {
  const name = projectName();
  document.body.classList.toggle('has-project', Boolean(name));
  if (!name) document.body.classList.remove('project-creating');
  $('#desktopBuildProject').textContent = name || 'Project workspace';
  $('#desktopFileProject').textContent = name || 'Choose a project';
  $('#desktopBreadcrumb').textContent = name || 'Workspace';
  $('#desktopPreviewName').textContent = name || 'Your next creation';
  $('.preview-art span').textContent = name ? 'Open Build to edit and preview this project.' : 'Create a project to begin.';
  const files = [...sourceFiles.querySelectorAll('[data-file]')];
  desktopList.replaceChildren();
  if (!name || !files.length) {
    const empty = document.createElement('div');
    empty.className = 'desktop-empty';
    empty.textContent = name ? 'This project has no files yet. Open Build to add one.' : 'Create or choose a project to see its files.';
    desktopList.append(empty);
  } else {
    for (const file of files.slice(0, 3)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'desktop-file-row';
      const icon = document.createElement('i');
      icon.className = 'ph ' + (file.dataset.file.includes('.') ? 'ph-file-code' : 'ph-folder');
      icon.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.textContent = file.dataset.file;
      const arrow = document.createElement('i');
      arrow.className = 'ph ph-caret-right';
      arrow.setAttribute('aria-hidden', 'true');
      button.append(icon, label, arrow);
      button.addEventListener('click', () => file.click());
      desktopList.append(button);
    }
  }
  $('#desktopFileCount').textContent = `${files.length} ${files.length === 1 ? 'item' : 'items'}`;
}

new MutationObserver(renderDesktop).observe(picker, { childList: true, attributes: true, subtree: true });
new MutationObserver(renderDesktop).observe(sourceFiles, { childList: true, subtree: true });
picker.addEventListener('change', renderDesktop);
$('#newProjectToggle').addEventListener('click', () => {
  document.body.classList.add('project-creating');
  $('#projectName').value = '';
  $('#projectDescription').value = '';
  $('#projectName').focus();
});
$('#createProject').addEventListener('click', () => {
  requestAnimationFrame(() => {
    if (projectName()) document.body.classList.remove('project-creating');
  });
});
$('#previewFile').addEventListener('click', () => {
  requestAnimationFrame(() => document.querySelector('.preview-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
});
renderDesktop();

$('#windowSwitcher').addEventListener('click', () => menu.showModal());
$('#closeWindowMenu').addEventListener('click', () => menu.close());
menu.addEventListener('click', event => { if (event.target === menu) menu.close(); });
menu.querySelectorAll('[data-window]').forEach(button => button.addEventListener('click', () => {
  menu.close();
  document.querySelector(`.nav[data-view="${button.dataset.window}"]`)?.click();
}));

document.querySelectorAll('[data-window-action]').forEach(button => button.addEventListener('click', () => {
  const windowElement = document.querySelector(`.window-${button.dataset.target}-${button.dataset.target === 'build' ? 'back' : 'front'}`);
  if (button.dataset.windowAction === 'maximize') {
    document.querySelector(`.nav[data-view="${button.dataset.target}"]`)?.click();
  } else if (button.dataset.windowAction === 'minimize') {
    windowElement.classList.toggle('minimized');
    windowElement.classList.remove('closed');
  } else {
    windowElement.classList.add('closed');
  }
}));
document.querySelector('.nav[data-view="home"]').addEventListener('click', () => {
  document.querySelectorAll('.desktop-home .window').forEach(windowElement => windowElement.classList.remove('closed', 'minimized'));
});
