    // 数据存储
    let notesData = [];
    let categoriesData = [];
    let filteredNotes = [];
    let currentCategory = 'all';
    let currentSearchTerm = '';
    let displayCount = 9;
    let currentSort = 'updated-desc';
    let editingCategoryId = null;
    let editingNoteId = null;
    let currentView = 'list'; // 'list' 或 'detail'
    let currentDetailNoteId = null;
    
    // 初始化函数
    async function init() {
      await loadData();
      renderCategories();
      renderNotes();
      initEventListeners();
      startDateTimeUpdate();
      
      // 确保images文件夹存在
      ensureImagesFolderExists();
    }
    
    // 确保images文件夹存在（在实际项目中需要服务器支持）
    function ensureImagesFolderExists() {
      // 前端无法直接创建文件夹，这里仅做提示
      console.log('请确保项目根目录下存在images文件夹，用于存储上传的图片');
    }
    
    // 加载数据 - 确保localStorage与JSON数据结构一致
    async function loadData(forceRefresh = false) {
      try {
        // 从JSON文件加载基础数据
        const response = await fetch('notesdata.json');
        const fileData = await response.json();
        
        // 确保数据结构正确
        const baseNotes = Array.isArray(fileData.notes) ? fileData.notes : [];
        const baseCategories = Array.isArray(fileData.categories) ? fileData.categories : [];
        
        // 仅当不强制刷新且存在localStorage数据时才合并
        if (!forceRefresh) {
          const savedNotes = localStorage.getItem('yumeNotes');
          const savedCategories = localStorage.getItem('yumeNoteCategories');
          
          // 合并笔记数据（localStorage中的更新会覆盖文件数据）
          if (savedNotes) {
            try {
              const localNotes = JSON.parse(savedNotes);
              if (Array.isArray(localNotes)) {
                // 创建ID映射，用于合并
                const noteMap = new Map();
                baseNotes.forEach(note => noteMap.set(note.id, note));
                
                // 合并本地笔记
                localNotes.forEach(localNote => {
                  // 确保本地笔记结构不超出JSON数据结构
                  const safeNote = {
                    id: localNote.id,
                    title: localNote.title || '',
                    category: localNote.category || '',
                    content: localNote.content || '',
                    createdAt: localNote.createdAt || new Date().toISOString(),
                    updatedAt: localNote.updatedAt || new Date().toISOString()
                  };
                  noteMap.set(safeNote.id, safeNote);
                });
                
                // 转换回数组
                notesData = Array.from(noteMap.values());
              } else {
                notesData = baseNotes;
              }
            } catch (e) {
              console.error('解析本地笔记数据失败，使用文件数据', e);
              notesData = baseNotes;
            }
          } else {
            notesData = baseNotes;
          }
          
          // 合并分类数据
          if (savedCategories) {
            try {
              const localCategories = JSON.parse(savedCategories);
              if (Array.isArray(localCategories)) {
                const categoryMap = new Map();
                baseCategories.forEach(cat => categoryMap.set(cat.id, cat));
                
                localCategories.forEach(localCat => {
                  const safeCategory = {
                    id: localCat.id,
                    name: localCat.name || '',
                    count: 0 // 计数会重新计算
                  };
                  categoryMap.set(safeCategory.id, safeCategory);
                });
                
                categoriesData = Array.from(categoryMap.values());
              } else {
                categoriesData = baseCategories;
              }
            } catch (e) {
              console.error('解析本地分类数据失败，使用文件数据', e);
              categoriesData = baseCategories;
            }
          } else {
            categoriesData = baseCategories;
          }
        } else {
          // 强制刷新 - 直接使用文件数据
          notesData = baseNotes;
          categoriesData = baseCategories;
          
          // 清除本地存储
          localStorage.removeItem('yumeNotes');
          localStorage.removeItem('yumeNoteCategories');
        }
        
        // 确保存在"其他"分类
        if (!categoriesData.some(cat => cat.id === 'other')) {
          categoriesData.push({ id: 'other', name: '其他', count: 0 });
        }
        
        // 计算每个分类的笔记数量
        updateCategoryCounts();
        
        // 保存到本地存储（确保结构一致）
        saveNotes();
        saveCategories();
        
      } catch (error) {
        console.error('加载数据失败:', error);
        // 使用默认数据
        categoriesData = [
          { id: 'work', name: '工作', count: 0 },
          { id: 'study', name: '学习', count: 0 },
          { id: 'life', name: '生活', count: 0 },
          { id: 'other', name: '其他', count: 0 }
        ];
        
        notesData = [
          {
            id: 1,
            title: "JavaScript 学习笔记",
            category: "study",
            content: "<h2>JavaScript 基础</h2><p>这是一门用于网页交互的编程语言。</p><p><strong>主要特点：</strong></p><ul><li>动态类型</li><li>原型继承</li><li>函数式编程支持</li></ul>",
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];
        
        updateCategoryCounts();
        saveNotes();
        saveCategories();
      }
    }
    
    // 保存笔记到本地存储 - 确保数据结构不超过JSON层级
    function saveNotes() {
      // 净化笔记数据，确保结构一致
      const safeNotes = notesData.map(note => ({
        id: note.id,
        title: note.title || '',
        category: note.category || '',
        content: note.content || '',
        createdAt: note.createdAt || new Date().toISOString(),
        updatedAt: note.updatedAt || new Date().toISOString()
      }));
      
      localStorage.setItem('yumeNotes', JSON.stringify(safeNotes));
    }
    
    // 保存分类到本地存储
    function saveCategories() {
      // 净化分类数据
      const safeCategories = categoriesData.map(cat => ({
        id: cat.id,
        name: cat.name || '',
        count: 0 // 计数不保存，每次重新计算
      }));
      
      localStorage.setItem('yumeNoteCategories', JSON.stringify(safeCategories));
    }
    
    // 更新分类计数
    function updateCategoryCounts() {
      categoriesData.forEach(category => {
        category.count = notesData.filter(note => note.category === category.id).length;
      });
      
      // 更新全部计数
      document.getElementById('all-count').textContent = notesData.length;
    }
    
    // 渲染分类（水平排列）
    function renderCategories() {
      const container = document.getElementById('categories-container');
      const select = document.getElementById('noteCategory');
      
      // 清空现有内容
      container.innerHTML = '';
      select.innerHTML = '';
      
      // 添加分类
      categoriesData.forEach(category => {
        // 添加到水平分类栏
        const div = document.createElement('div');
        div.className = `category-item px-4 py-2 rounded-full hover:bg-slate-700 flex items-center cursor-pointer whitespace-nowrap ${currentCategory === category.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200'}`;
        div.dataset.category = category.id;
        div.innerHTML = `
          <i class="fas fa-grip-lines category-handle" title="拖拽排序"></i>
          <span>${category.name}</span>
          <span class="ml-2 bg-slate-600 text-xs px-2 py-0.5 rounded-full">${category.count}</span>
          <button class="category-edit-btn" data-id="${category.id}" title="编辑分类">
            <i class="fas fa-edit"></i>
          </button>
        `;
        container.appendChild(div);
        
        // 添加到选择框
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        select.appendChild(option);
      });
      
      // 初始化分类拖拽排序
      initCategoryDragSort();
    }
    
    // 初始化分类拖拽排序
    function initCategoryDragSort() {
      const categoryItems = document.querySelectorAll('.category-item[data-category]:not([data-category="all"])');
      let draggedItem = null;
      
      categoryItems.forEach(item => {
        item.setAttribute('draggable', 'true');
        
        item.addEventListener('dragstart', function() {
          draggedItem = this;
          setTimeout(() => this.classList.add('dragging'), 0);
        });
        
        item.addEventListener('dragend', function() {
          draggedItem = null;
          this.classList.remove('dragging');
          
          // 更新分类顺序
          const newOrder = [];
          document.querySelectorAll('.category-item[data-category]:not([data-category="all"])').forEach(catItem => {
            const catId = catItem.dataset.category;
            const category = categoriesData.find(c => c.id === catId);
            if (category) newOrder.push(category);
          });
          
          categoriesData = newOrder;
          saveCategories();
        });
        
        item.addEventListener('dragover', function(e) {
          e.preventDefault();
          if (!draggedItem || draggedItem === this) return;
          
          const rect = this.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const mouseY = e.clientY;
          
          if (mouseY < midY) {
            this.parentNode.insertBefore(draggedItem, this);
          } else {
            this.parentNode.insertBefore(draggedItem, this.nextSibling);
          }
        });
      });
    }
    
    // 渲染笔记列表
    function renderNotes() {
      const container = document.getElementById('notes-container');
      const noResults = document.getElementById('noResults');
      
      // 过滤和排序笔记
      filteredNotes = filterAndSortNotes();
      
      // 清空现有内容
      container.innerHTML = '';
      
      // 显示/隐藏无结果提示
      if (filteredNotes.length === 0) {
        noResults.classList.remove('hidden');
      } else {
        noResults.classList.add('hidden');
      }
      
      // 显示笔记
      const notesToShow = filteredNotes.slice(0, displayCount);
      
      notesToShow.forEach(note => {
        const category = categoriesData.find(c => c.id === note.category) || { name: '其他' };
        const updatedDate = new Date(note.updatedAt);
        const daysAgo = Math.floor((Date.now() - updatedDate) / (1000 * 60 * 60 * 24));
        const timeText = daysAgo === 0 ? '今天更新' : daysAgo === 1 ? '昨天更新' : `${daysAgo}天前更新`;
        
        // 提取纯文本预览
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.content;
        const previewText = tempDiv.textContent.trim().substring(0, 100) + (tempDiv.textContent.length > 100 ? '...' : '');
        
        const noteCard = document.createElement('div');
        noteCard.className = 'card overflow-hidden note-card flex flex-col';
        noteCard.dataset.id = note.id;
        noteCard.setAttribute('draggable', currentSort === 'custom');
        
        noteCard.innerHTML = `
          ${currentSort === 'custom' ? '<i class="fas fa-grip-lines absolute top-2 left-2 text-slate-500" title="拖拽排序"></i>' : ''}
          <div class="p-5 flex-1 flex flex-col ${currentSort === 'custom' ? 'pt-8' : ''}">
            <div class="flex justify-between items-start mb-3">
              <h3 class="font-medium text-slate-100 truncate">${note.title}</h3>
              <span class="category-badge px-2.5 py-0.5 text-xs">${category.name}</span>
            </div>
            <div class="text-slate-400 text-sm mb-4 line-clamp-3 flex-1">${previewText}</div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-slate-500">${timeText}</span>
              <div class="flex space-x-3">
                <button class="text-blue-400 hover:text-blue-300 edit-note" data-id="${note.id}" title="编辑">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="text-red-400 hover:text-red-100 delete-note" data-id="${note.id}" title="删除">
                  <i class="fas fa-trash"></i>
                </button>
                <button class="text-slate-400 hover:text-slate-200 view-note" data-id="${note.id}" title="查看详情">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>
          </div>
        `;
        container.appendChild(noteCard);
      });
      
      // 显示/隐藏加载更多按钮
      const loadMoreContainer = document.getElementById('loadMoreContainer');
      if (filteredNotes.length > displayCount) {
        loadMoreContainer.classList.remove('hidden');
      } else {
        loadMoreContainer.classList.add('hidden');
      }
      
      // 初始化笔记拖拽排序（仅在自定义排序模式下）
      if (currentSort === 'custom') {
        initNoteDragSort();
      }
    }
    
    // 初始化笔记拖拽排序
    function initNoteDragSort() {
      const noteCards = document.querySelectorAll('.note-card');
      let draggedItem = null;
      
      noteCards.forEach(item => {
        item.addEventListener('dragstart', function() {
          draggedItem = this;
          setTimeout(() => this.classList.add('dragging'), 0);
        });
        
        item.addEventListener('dragend', function() {
          draggedItem = null;
          this.classList.remove('dragging');
          
          // 更新笔记顺序
          const newOrder = [];
          document.querySelectorAll('.note-card').forEach(card => {
            const noteId = parseInt(card.dataset.id);
            const note = notesData.find(n => n.id === noteId);
            if (note) newOrder.push(note);
          });
          
          // 保留不在当前视图中的笔记
          const remainingNotes = notesData.filter(note => 
            !newOrder.some(n => n.id === note.id)
          );
          
          notesData = [...newOrder, ...remainingNotes];
          
          // 更新更新时间，确保排序持久化
          notesData.forEach(note => {
            note.updatedAt = new Date().toISOString();
          });
          
          saveNotes();
        });
        
        item.addEventListener('dragover', function(e) {
          e.preventDefault();
          if (!draggedItem || draggedItem === this) return;
          
          const rect = this.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const mouseY = e.clientY;
          
          if (mouseY < midY) {
            this.parentNode.insertBefore(draggedItem, this);
          } else {
            this.parentNode.insertBefore(draggedItem, this.nextSibling);
          }
        });
      });
    }
    
    // 显示笔记详情
    function showNoteDetail(noteId) {
      const note = notesData.find(n => n.id == noteId);
      if (!note) return;
      
      currentDetailNoteId = noteId;
      currentView = 'detail';
      
      // 更新视图显示状态
      document.getElementById('notesListContainer').style.display = 'none';
      document.getElementById('noteDetailContainer').style.display = 'block';
      
      // 填充详情数据
      const category = categoriesData.find(c => c.id === note.category) || { name: '其他' };
      const createdAt = new Date(note.createdAt).toLocaleString();
      const updatedAt = new Date(note.updatedAt).toLocaleString();
      
      document.getElementById('detailTitle').textContent = note.title;
      document.getElementById('detailCategory').innerHTML = `<i class="fas fa-folder mr-1"></i>${category.name}`;
      document.getElementById('detailCreated').innerHTML = `<i class="fas fa-calendar-plus mr-1"></i>创建于 ${createdAt}`;
      document.getElementById('detailUpdated').innerHTML = `<i class="fas fa-calendar-check mr-1"></i>更新于 ${updatedAt}`;
      document.getElementById('detailContent').innerHTML = note.content;
    }
    
    // 返回笔记列表
    function backToNotesList() {
      currentView = 'list';
      currentDetailNoteId = null;
      
      // 更新视图显示状态
      document.getElementById('notesListContainer').style.display = 'block';
      document.getElementById('noteDetailContainer').style.display = 'none';
    }
    
    // 过滤和排序笔记
    function filterAndSortNotes() {
      let filtered = [...notesData];
      
      // 按分类过滤
      if (currentCategory !== 'all') {
        filtered = filtered.filter(note => note.category === currentCategory);
      }
      
      // 按搜索词过滤
      if (currentSearchTerm) {
        const searchTerm = currentSearchTerm.toLowerCase();
        filtered = filtered.filter(note => 
          note.title.toLowerCase().includes(searchTerm) ||
          note.content.toLowerCase().includes(searchTerm)
        );
      }
      
      // 按选择的方式排序
      switch(currentSort) {
        case 'updated-desc':
          return filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        case 'updated-asc':
          return filtered.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
        case 'title-asc':
          return filtered.sort((a, b) => a.title.localeCompare(b.title));
        case 'title-desc':
          return filtered.sort((a, b) => b.title.localeCompare(a.title));
        case 'custom':
          // 保持当前顺序（由拖拽排序决定）
          return filtered;
        default:
          return filtered;
      }
    }
    
    // 初始化事件监听器
    function initEventListeners() {
      // 分类筛选
      document.getElementById('categories-container').addEventListener('click', function(e) {
        const categoryItem = e.target.closest('.category-item');
        if (categoryItem) {
          // 防止点击编辑按钮时触发分类切换
          if (!e.target.closest('.category-edit-btn') && !e.target.closest('.category-handle')) {
            currentCategory = categoryItem.dataset.category;
            
            // 更新选中状态
            document.querySelectorAll('.category-item').forEach(item => {
              item.classList.remove('bg-blue-600', 'text-white');
              item.classList.add('bg-slate-800', 'text-slate-200');
            });
            
            document.querySelector(`.category-item[data-category="${currentCategory}"]`)
              .classList.add('bg-blue-600', 'text-white');
            
            // 重新渲染笔记
            displayCount = 9;
            renderNotes();
          }
        }
        
        // 分类编辑按钮点击
        const editBtn = e.target.closest('.category-edit-btn');
        if (editBtn) {
          e.stopPropagation();
          editingCategoryId = editBtn.dataset.id;
          const category = categoriesData.find(c => c.id === editingCategoryId);
          
          if (category) {
            document.getElementById('categoryName').value = category.name;
            document.getElementById('categoryModal').style.display = 'flex';
          }
        }
      });
      
      // 排序方式变更
      document.getElementById('sortSelector').addEventListener('change', function() {
        currentSort = this.value;
        document.getElementById('customSortControls').classList.toggle('hidden', currentSort !== 'custom');
        renderNotes();
      });
      
      // 保存自定义排序
      document.getElementById('saveSortBtn').addEventListener('click', function() {
        alert('自定义排序已保存');
      });
      
      // 搜索功能
      document.getElementById('searchInput').addEventListener('input', function(e) {
        currentSearchTerm = e.target.value.trim();
        displayCount = 9; // 重置加载计数
        renderNotes();
      });
      
      // 加载更多
      document.getElementById('loadMoreBtn').addEventListener('click', function() {
        displayCount += 9;
        renderNotes();
      });
      
      // 添加笔记
      document.getElementById('addNoteBtn').addEventListener('click', function() {
        // 重置表单
        document.getElementById('noteModalTitle').innerHTML = '<i class="fas fa-plus-circle mr-2"></i> 添加新笔记';
        document.getElementById('noteId').value = '';
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteContent').innerHTML = '';
        document.getElementById('deleteNoteBtn').classList.add('hidden');
        editingNoteId = null;
        
        // 显示模态框
        document.getElementById('noteModal').style.display = 'flex';
      });
      
      // 添加分类
      document.getElementById('addCategoryBtn').addEventListener('click', function() {
        const newName = prompt('请输入新分类名称');
        if (newName && newName.trim()) {
          const newId = newName.toLowerCase().replace(/\s+/g, '-');
          // 检查分类是否已存在
          if (categoriesData.some(cat => cat.id === newId || cat.name.toLowerCase() === newName.toLowerCase())) {
            alert('该分类已存在');
            return;
          }
          
          categoriesData.push({
            id: newId,
            name: newName,
            count: 0
          });
          
          saveCategories();
          renderCategories();
          alert(`分类 "${newName}" 已创建`);
        }
      });
      
      // 保存笔记
      document.getElementById('saveNoteBtn').addEventListener('click', function() {
        const title = document.getElementById('noteTitle').value.trim();
        const category = document.getElementById('noteCategory').value;
        const content = document.getElementById('noteContent').innerHTML.trim();
        const noteId = document.getElementById('noteId').value;
        
        if (!title) {
          alert('请填写笔记标题');
          return;
        }
        
        if (noteId) {
          // 编辑现有笔记
          const index = notesData.findIndex(note => note.id == noteId);
          if (index !== -1) {
            // 如果分类变了，更新计数
            const oldCategory = notesData[index].category;
            if (oldCategory !== category) {
              updateCategoryCount(oldCategory, -1);
              updateCategoryCount(category, 1);
            }
            
            notesData[index] = {
              ...notesData[index],
              title,
              category,
              content,
              updatedAt: new Date().toISOString()
            };
          }
        } else {
          // 创建新笔记
          const newNote = {
            id: Date.now(),
            title,
            category,
            content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          notesData.unshift(newNote);
          
          // 更新分类计数
          updateCategoryCount(category, 1);
        }
        
        saveNotes();
        saveCategories();
        renderCategories();
        renderNotes();
        
        // 关闭模态框
        document.getElementById('noteModal').style.display = 'none';
      });
      
      // 更新单个分类计数
      function updateCategoryCount(categoryId, change) {
        const catIndex = categoriesData.findIndex(c => c.id === categoryId);
        if (catIndex !== -1) {
          categoriesData[catIndex].count += change;
          if (categoriesData[catIndex].count < 0) categoriesData[catIndex].count = 0;
        }
      }
      
      // 取消笔记编辑
      document.getElementById('cancelNoteBtn').addEventListener('click', function() {
        document.getElementById('noteModal').style.display = 'none';
      });
      
      // 取消分类编辑
      document.getElementById('cancelCategoryBtn').addEventListener('click', function() {
        document.getElementById('categoryModal').style.display = 'none';
        editingCategoryId = null;
      });
      
      // 保存分类
      document.getElementById('saveCategoryBtn').addEventListener('click', function() {
        const name = document.getElementById('categoryName').value.trim();
        if (!name) {
          alert('请输入分类名称');
          return;
        }
        
        if (editingCategoryId) {
          const index = categoriesData.findIndex(c => c.id === editingCategoryId);
          if (index !== -1) {
            // 检查名称是否已存在（排除当前分类）
            if (categoriesData.some((c, i) => i !== index && c.name.toLowerCase() === name.toLowerCase())) {
              alert('该分类名称已存在');
              return;
            }
            
            categoriesData[index].name = name;
            saveCategories();
            renderCategories();
            document.getElementById('categoryModal').style.display = 'none';
            editingCategoryId = null;
          }
        }
      });
      
      // 删除分类
      document.getElementById('deleteCategoryBtn').addEventListener('click', function() {
        if (editingCategoryId && confirm('确定要删除这个分类吗？该分类下的所有笔记将被移到"其他"分类。')) {
          // 找到默认分类"其他"
          let otherCategory = categoriesData.find(c => c.id === 'other');
          if (!otherCategory) {
            otherCategory = { id: 'other', name: '其他', count: 0 };
            categoriesData.push(otherCategory);
          }
          
          // 将该分类下的笔记移到"其他"分类
          let movedCount = 0;
          notesData.forEach(note => {
            if (note.category === editingCategoryId) {
              note.category = 'other';
              movedCount++;
            }
          });
          
          // 更新"其他"分类计数
          otherCategory.count += movedCount;
          
          // 从分类列表中删除
          const index = categoriesData.findIndex(c => c.id === editingCategoryId);
          if (index !== -1) {
            categoriesData.splice(index, 1);
          }
          
          // 如果当前选中的是被删除的分类，切换到"全部"
          if (currentCategory === editingCategoryId) {
            currentCategory = 'all';
          }
          
          saveNotes();
          saveCategories();
          renderCategories();
          renderNotes();
          document.getElementById('categoryModal').style.display = 'none';
          editingCategoryId = null;
        }
      });
      
      // 笔记操作（编辑、删除、查看）
      document.getElementById('notes-container').addEventListener('click', function(e) {
        const editBtn = e.target.closest('.edit-note');
        if (editBtn) {
          const noteId = editBtn.dataset.id;
          const note = notesData.find(n => n.id == noteId);
          
          if (note) {
            editingNoteId = noteId;
            document.getElementById('noteModalTitle').innerHTML = '<i class="fas fa-edit mr-2"></i> 编辑笔记';
            document.getElementById('noteId').value = note.id;
            document.getElementById('noteTitle').value = note.title;
            document.getElementById('noteCategory').value = note.category;
            document.getElementById('noteContent').innerHTML = note.content;
            document.getElementById('deleteNoteBtn').classList.remove('hidden');
            
            document.getElementById('noteModal').style.display = 'flex';
          }
        }
        
        const deleteBtn = e.target.closest('.delete-note');
        if (deleteBtn) {
          const noteId = deleteBtn.dataset.id;
          if (confirm('确定要删除这条笔记吗？')) {
            const index = notesData.findIndex(n => n.id == noteId);
            if (index !== -1) {
              const category = notesData[index].category;
              notesData.splice(index, 1);
              
              // 更新分类计数
              updateCategoryCount(category, -1);
              
              saveNotes();
              saveCategories();
              renderCategories();
              renderNotes();
            }
          }
        }
        
        const viewBtn = e.target.closest('.view-note');
        if (viewBtn) {
          const noteId = viewBtn.dataset.id;
          showNoteDetail(noteId);
        }
      });
      
      // 详情页操作
      document.getElementById('detailBackBtn').addEventListener('click', backToNotesList);
      
      document.getElementById('detailEditBtn').addEventListener('click', function() {
        if (currentDetailNoteId) {
          const note = notesData.find(n => n.id == currentDetailNoteId);
          
          if (note) {
            editingNoteId = currentDetailNoteId;
            document.getElementById('noteModalTitle').innerHTML = '<i class="fas fa-edit mr-2"></i> 编辑笔记';
            document.getElementById('noteId').value = note.id;
            document.getElementById('noteTitle').value = note.title;
            document.getElementById('noteCategory').value = note.category;
            document.getElementById('noteContent').innerHTML = note.content;
            document.getElementById('deleteNoteBtn').classList.remove('hidden');
            
            document.getElementById('noteModal').style.display = 'flex';
          }
        }
      });
      
      document.getElementById('detailDeleteBtn').addEventListener('click', function() {
        if (currentDetailNoteId && confirm('确定要删除这条笔记吗？')) {
          const index = notesData.findIndex(n => n.id == currentDetailNoteId);
          if (index !== -1) {
            const category = notesData[index].category;
            notesData.splice(index, 1);
            
            // 更新分类计数
            updateCategoryCount(category, -1);
            
            saveNotes();
            saveCategories();
            renderCategories();
            renderNotes();
            
            // 返回列表视图
            backToNotesList();
          }
        }
      });
      
      // 删除笔记（模态框内）
      document.getElementById('deleteNoteBtn').addEventListener('click', function() {
        if (editingNoteId && confirm('确定要删除这条笔记吗？')) {
          const index = notesData.findIndex(n => n.id == editingNoteId);
          if (index !== -1) {
            const category = notesData[index].category;
            notesData.splice(index, 1);
            
            // 更新分类计数
            updateCategoryCount(category, -1);
            
            saveNotes();
            saveCategories();
            renderCategories();
            renderNotes();
            document.getElementById('noteModal').style.display = 'none';
            editingNoteId = null;
            
            // 如果当前在详情页，返回列表
            if (currentView === 'detail' && currentDetailNoteId == editingNoteId) {
              backToNotesList();
            }
          }
        }
      });
      
      // 编辑器工具栏按钮 - 实时显示格式效果
      document.querySelectorAll('.toolbar-btn[data-command]').forEach(btn => {
        btn.addEventListener('click', function() {
          const command = this.dataset.command;
          const value = this.dataset.value || null;
          
          // 执行命令并立即刷新显示
          document.execCommand(command, false, value);
          
          // 对于列表等需要刷新的命令，强制更新编辑器内容
          if (command === 'insertUnorderedList' || command === 'insertOrderedList') {
            const temp = document.getElementById('noteContent').innerHTML;
            document.getElementById('noteContent').innerHTML = temp;
          }
          
          document.getElementById('noteContent').focus();
        });
      });
      
      // 插入链接
      document.getElementById('createLinkBtn').addEventListener('click', function() {
        const url = prompt('请输入链接地址:');
        if (url) {
          let text = window.getSelection().toString();
          if (!text) {
            text = url;
          }
          document.execCommand('insertHTML', false, `<a href="${url}" target="_blank">${text}</a>`);
        }
        document.getElementById('noteContent').focus();
      });
      
      // 插入图片 - 保存到项目images文件夹
      document.getElementById('insertImageBtn').addEventListener('click', function() {
        document.getElementById('imageUpload').click();
      });
      
      document.getElementById('imageUpload').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
          alert('请选择图片文件');
          return;
        }
        
        // 在实际项目中，这里应该通过后端API将图片保存到images文件夹
        // 前端仅做模拟，实际部署时需要后端支持
        const reader = new FileReader();
        reader.onload = function(event) {
          // 生成唯一文件名
          const fileName = `note-image-${Date.now()}.${file.name.split('.').pop()}`;
          // 图片路径指向项目的images文件夹
          const imagePath = `images/${fileName}`;
          
          // 这里应该有上传到服务器的逻辑
          console.log(`图片应保存到: ${imagePath}`);
          
          // 插入图片到编辑器 - 实际项目中应使用服务器返回的路径
          document.execCommand('insertHTML', false, `<img src="${event.target.result}" data-src="${imagePath}" alt="插入的图片" style="max-width:100%;margin:1rem 0;">`);
        };
        reader.readAsDataURL(file);
        
        // 重置文件输入，允许重复选择同一文件
        this.value = '';
      });
      
      // 导入笔记
      document.getElementById('importBtn').addEventListener('click', function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = e => {
          const file = e.target.files[0];
          if (!file) return;
          
          const reader = new FileReader();
          reader.onload = event => {
            try {
              const importedData = JSON.parse(event.target.result);
              
              if (importedData.notes && Array.isArray(importedData.notes)) {
                // 合并笔记（去重）
                importedData.notes.forEach(importedNote => {
                  // 净化导入的笔记数据
                  const safeNote = {
                    id: importedNote.id || Date.now(),
                    title: importedNote.title || `导入的笔记 ${new Date().getTime()}`,
                    category: importedNote.category || 'other',
                    content: importedNote.content || '',
                    createdAt: importedNote.createdAt || new Date().toISOString(),
                    updatedAt: importedNote.updatedAt || new Date().toISOString()
                  };
                  
                  const existingIndex = notesData.findIndex(n => n.id == safeNote.id);
                  if (existingIndex === -1) {
                    notesData.push(safeNote);
                  } else {
                    // 如果已存在，更新为较新的版本
                    const existingDate = new Date(notesData[existingIndex].updatedAt);
                    const importedDate = new Date(safeNote.updatedAt);
                    if (importedDate > existingDate) {
                      notesData[existingIndex] = safeNote;
                    }
                  }
                });
                
                // 合并分类
                if (importedData.categories && Array.isArray(importedData.categories)) {
                  importedData.categories.forEach(importedCat => {
                    const safeCategory = {
                      id: importedCat.id,
                      name: importedCat.name || importedCat.id,
                      count: 0
                    };
                    
                    const existingIndex = categoriesData.findIndex(c => c.id === safeCategory.id);
                    if (existingIndex === -1) {
                      categoriesData.push(safeCategory);
                    } else {
                      // 只更新名称
                      categoriesData[existingIndex].name = safeCategory.name;
                    }
                  });
                }
                
                updateCategoryCounts();
                saveNotes();
                saveCategories();
                renderCategories();
                renderNotes();
                
                alert(`成功导入 ${importedData.notes.length} 条笔记`);
              } else {
                alert('导入失败：无效的文件格式');
              }
            } catch (error) {
              console.error('导入失败:', error);
              alert('导入失败：文件格式错误');
            }
          };
          reader.readAsText(file);
        };
        
        input.click();
      });
      
      // 导出笔记
      document.getElementById('exportBtn').addEventListener('click', function() {
        const exportData = {
          notes: notesData.map(note => ({
            id: note.id,
            title: note.title,
            category: note.category,
            content: note.content,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt
          })),
          categories: categoriesData.map(cat => ({
            id: cat.id,
            name: cat.name
          })),
          exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `yume-notes-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
      
      // 从文件刷新数据
      document.getElementById('refreshBtn').addEventListener('click', function() {
        if (confirm('确定要从文件刷新数据吗？这将覆盖本地修改！')) {
          loadData(true).then(() => {
            renderCategories();
            renderNotes();
            alert('数据已从文件刷新');
          });
        }
      });
    }
    
    // 更新当前日期时间
    function startDateTimeUpdate() {
      function updateDateTime() {
        const now = new Date();
        
        // 格式化日期
        const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' };
        const dateStr = now.toLocaleDateString('zh-CN', dateOptions).replace(/\//g, '-');
        
        // 格式化时间
        const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        document.getElementById('currentDate').textContent = dateStr;
        document.getElementById('currentTime').textContent = timeStr;
      }
      
      // 立即更新一次
      updateDateTime();
      // 每秒更新一次
      setInterval(updateDateTime, 1000);
    }
    
    // 辅助函数：去除HTML标签
    function stripHtml(html) {
      return html ? html.replace(/<[^>]*>?/gm, '') : '';
    }
    
    // 页面加载完成后初始化
    document.addEventListener('DOMContentLoaded', init);