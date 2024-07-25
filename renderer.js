const { ipcRenderer } = require('electron');
const path = require('path');

const appDataPath = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share");
const playableLevelsPath = path.join(appDataPath, 'The Orange Squad ReForm', 'Levels', 'PlayableLevels');
const createdLevelsPath = path.join(appDataPath, 'The Orange Squad ReForm', 'Levels', 'CreatedLevels');

const playableLevelsContainer = document.getElementById('playableLevels');
const createdLevelsContainer = document.getElementById('createdLevels');
const metadataModal = document.getElementById('metadataModal');
const metadataContent = document.getElementById('metadataContent');
const editMetadataBtn = document.getElementById('editMetadataBtn');
const installLevelBtn = document.getElementById('installLevelBtn');

async function loadLevels() {
  await loadLevelsForContainer(playableLevelsPath, playableLevelsContainer, 'playable');
  await loadLevelsForContainer(createdLevelsPath, createdLevelsContainer, 'created');
}

async function loadLevelsForContainer(directoryPath, container, type) {
  try {
    const files = await ipcRenderer.invoke('read-directory', directoryPath);
    container.innerHTML = '';
    files.forEach(file => {
      if (path.extname(file) === '.rfldf') {
        const levelItem = createLevelItem(file, type);
        container.appendChild(levelItem);
      }
    });
  } catch (err) {
    console.error(`Error reading directory: ${err}`);
  }
}

function createLevelItem(filename, type) {
  const levelItem = document.createElement('div');
  levelItem.className = 'level-item';
  levelItem.innerHTML = `
    <span>${filename}</span>
    <div class="level-actions">
      <button class="view-btn" title="View Metadata"><i class="fas fa-eye"></i></button>
      <button class="move-btn" title="Move Level"><i class="fas fa-exchange-alt"></i></button>
      <button class="copy-btn" title="Copy Level"><i class="fas fa-copy"></i></button>
      <button class="delete-btn" title="Delete Level"><i class="fas fa-trash"></i></button>
    </div>
  `;

  levelItem.querySelector('.view-btn').addEventListener('click', () => viewMetadata(filename, type));
  levelItem.querySelector('.move-btn').addEventListener('click', () => moveLevel(filename, type));
  levelItem.querySelector('.copy-btn').addEventListener('click', () => copyLevel(filename, type));
  levelItem.querySelector('.delete-btn').addEventListener('click', () => deleteLevel(filename, type));

  return levelItem;
}

async function viewMetadata(filename, type) {
  const filePath = path.join(type === 'playable' ? playableLevelsPath : createdLevelsPath, filename);
  try {
    const data = await ipcRenderer.invoke('read-file', filePath);
    const metadata = parseMetadata(data);
    displayMetadata(metadata, filename, type);
  } catch (err) {
    console.error(`Error reading file: ${err}`);
  }
}

function parseMetadata(data) {
  const metadata = {};
  const lines = data.split('\n');
  for (const line of lines) {
    if (line.startsWith('<<') && line.includes('>>:')) {
      const [key, value] = line.split('>>:');
      metadata[key.substring(2)] = value.trim();
    }
  }
  return metadata;
}

function displayMetadata(metadata, filename, type) {
  metadataContent.innerHTML = '';
  for (const [key, value] of Object.entries(metadata)) {
    metadataContent.innerHTML += `<p><strong>${key}:</strong> ${value}</p>`;
  }
  metadataModal.style.display = 'block';
  editMetadataBtn.onclick = () => displayEditMetadataForm(metadata, filename, type);
}

async function moveLevel(filename, sourceType) {
    const sourcePath = sourceType === 'playable' ? playableLevelsPath : createdLevelsPath;
    const destPath = sourceType === 'playable' ? createdLevelsPath : playableLevelsPath;
    
    try {
      await ipcRenderer.invoke('rename-file', path.join(sourcePath, filename), path.join(destPath, filename));
      await loadLevels();
    } catch (err) {
      console.error(`Error moving file: ${err}`);
    }
  }
  
  async function copyLevel(filename, sourceType) {
    const sourcePath = sourceType === 'playable' ? playableLevelsPath : createdLevelsPath;
    const destPath = sourceType === 'playable' ? createdLevelsPath : playableLevelsPath;
    
    try {
      await ipcRenderer.invoke('copy-file', path.join(sourcePath, filename), path.join(destPath, filename));
      await loadLevels();
    } catch (err) {
      console.error(`Error copying file: ${err}`);
    }
  }
  
  async function deleteLevel(filename, type) {
    const filePath = path.join(type === 'playable' ? playableLevelsPath : createdLevelsPath, filename);
    
    try {
      await ipcRenderer.invoke('delete-file', filePath);
      await loadLevels();
    } catch (err) {
      console.error(`Error deleting file: ${err}`);
    }
  }
  
  function displayEditMetadataForm(metadata, filename, type) {
    metadataContent.innerHTML = '';
    const form = document.createElement('form');
    form.id = 'editMetadataForm';
  
    for (const [key, value] of Object.entries(metadata)) {
      const input = document.createElement('input');
      input.type = 'text';
      input.name = key;
      input.value = value;
      input.required = true;
  
      const label = document.createElement('label');
      label.textContent = key;
      label.appendChild(input);
  
      form.appendChild(label);
    }
  
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.textContent = 'Save Changes';
    form.appendChild(submitBtn);
  
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const updatedMetadata = Object.fromEntries(new FormData(form));
      await saveMetadata(updatedMetadata, filename, type);
    });
  
    metadataContent.appendChild(form);
  }
  
  async function saveMetadata(metadata, filename, type) {
    const filePath = path.join(type === 'playable' ? playableLevelsPath : createdLevelsPath, filename);
    
    try {
      const data = await ipcRenderer.invoke('read-file', filePath);
      let updatedContent = data;
      for (const [key, value] of Object.entries(metadata)) {
        const regex = new RegExp(`<<${key}>>:.*`, 'g');
        updatedContent = updatedContent.replace(regex, `<<${key}>>:${value}`);
      }
  
      await ipcRenderer.invoke('write-file', filePath, updatedContent);
      console.log('Metadata updated successfully');
      displayMetadata(metadata, filename, type);
    } catch (err) {
      console.error(`Error updating metadata: ${err}`);
    }
  }
  
  installLevelBtn.addEventListener('click', async () => {
    try {
      const result = await ipcRenderer.invoke('open-file-dialog');
      if (!result.canceled && result.filePaths.length > 0) {
        const sourcePath = result.filePaths[0];
        const filename = path.basename(sourcePath);
        
        const response = await ipcRenderer.invoke('show-message-box', {
          type: 'question',
          buttons: ['Playable Levels', 'Created Levels', 'Cancel'],
          defaultId: 2,
          title: 'Choose Installation Location',
          message: 'Where would you like to install the level?'
        });
  
        if (response.response === 0) {
          await installLevel(sourcePath, filename, playableLevelsPath);
        } else if (response.response === 1) {
          await installLevel(sourcePath, filename, createdLevelsPath);
        }
      }
    } catch (err) {
      console.error(`Error installing level: ${err}`);
    }
  });
  
  async function installLevel(sourcePath, filename, destPath) {
    const destFilePath = path.join(destPath, filename);
    try {
      await ipcRenderer.invoke('copy-file', sourcePath, destFilePath);
      console.log('Level installed successfully');
      await loadLevels();
    } catch (err) {
      console.error(`Error installing level: ${err}`);
    }
  }
  
  // Close modal when clicking on the close button or outside the modal
  document.querySelector('.close').addEventListener('click', () => {
    metadataModal.style.display = 'none';
  });
  
  window.addEventListener('click', (event) => {
    if (event.target === metadataModal) {
      metadataModal.style.display = 'none';
    }
  });
  
  // Load levels when the application starts
  loadLevels();