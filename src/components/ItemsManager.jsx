import React, { useState, useEffect } from 'react'
import ItemsService from '../services/ItemsService'

function ItemsManager() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newItem, setNewItem] = useState({ name: '', description: '' })
  const [editingItem, setEditingItem] = useState(null)

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    try {
      setLoading(true)
      setError(null)
      const fetchedItems = await ItemsService.getAllItems()
      setItems(fetchedItems)
    } catch (err) {
      setError(`Failed to load items: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateItem = async (e) => {
    e.preventDefault()
    if (!newItem.name.trim()) return

    try {
      setError(null)
      const createdItem = await ItemsService.createItem(newItem)
      setItems([...items, createdItem])
      setNewItem({ name: '', description: '' })
    } catch (err) {
      setError(`Failed to create item: ${err.message}`)
    }
  }

  const handleUpdateItem = async (id, updatedItem) => {
    try {
      setError(null)
      const updated = await ItemsService.updateItem(id, updatedItem)
      setItems(items.map(item => item.id === id ? updated : item))
      setEditingItem(null)
    } catch (err) {
      setError(`Failed to update item: ${err.message}`)
    }
  }

  const handleDeleteItem = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      setError(null)
      await ItemsService.deleteItem(id)
      setItems(items.filter(item => item.id !== id))
    } catch (err) {
      setError(`Failed to delete item: ${err.message}`)
    }
  }

  if (loading) return <div className="loading">⏳ Loading items...</div>

  return (
    <div className="items-manager">
      {error && <div className="error">{error}</div>}

      {/* Create new item form - styled like message form */}
      <div className="message-section">
        <div className="message-section-header">
          <h3 className="message-heading">➕ Add New Item</h3>
        </div>
        <div className="message-form-container">
          <form onSubmit={handleCreateItem} className="message-form">
            <div className="form-group">
              <div className="input-wrapper">
                <span className="input-icon">🏷️</span>
                <input
                  type="text"
                  placeholder="Item name"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="author-input"
                  maxLength="100"
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <div className="input-wrapper">
                <span className="input-icon">📝</span>
                <textarea
                  placeholder="Item description"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  rows="3"
                  className="message-input"
                  maxLength="500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={!newItem.name.trim()}
              className="submit-btn"
            >
              <span className="btn-icon">✨</span>
              Create Item
            </button>
          </form>
        </div>
      </div>

      {/* Items list - styled like messages display */}
      <div className="messages-display">
        <h3 className="message-heading">📦 All Items ({items.length})</h3>
        <div className="messages-list">
          {items.length === 0 ? (
            <p className="no-messages">No items found. Create your first item above!</p>
          ) : (
            items.map(item => (
              <div key={item.id} className="message-item">
                {editingItem === item.id ? (
                  <EditItemForm
                    item={item}
                    onSave={(updatedItem) => handleUpdateItem(item.id, updatedItem)}
                    onCancel={() => setEditingItem(null)}
                  />
                ) : (
                  <ItemDisplay
                    item={item}
                    onEdit={() => setEditingItem(item.id)}
                    onDelete={() => handleDeleteItem(item.id)}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function ItemDisplay({ item, onEdit, onDelete }) {
  return (
    <>
      <div className="message-header">
        <strong>{item.name}</strong>
        <span className="message-meta">
          {new Date(item.createdAt).toLocaleString('sv-SE')}
          {item.updatedAt !== item.createdAt && (
            <span className="processed-by"> (updated: {new Date(item.updatedAt).toLocaleString('sv-SE')})</span>
          )}
        </span>
      </div>

      <p className="message-content">{item.description || 'No description provided'}</p>

      <div className="item-actions">
        <button onClick={onEdit} className="edit-btn">✏️ Edit</button>
        <button onClick={onDelete} className="delete-btn">🗑️ Delete</button>
      </div>
    </>
  )
}

function EditItemForm({ item, onSave, onCancel }) {
  const [editedItem, setEditedItem] = useState({
    name: item.name,
    description: item.description
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(editedItem)
  }

  return (
    <form onSubmit={handleSubmit} className="edit-item-form">
      <div className="form-group">
        <div className="input-wrapper">
          <span className="input-icon">🏷️</span>
          <input
            type="text"
            value={editedItem.name}
            onChange={(e) => setEditedItem({ ...editedItem, name: e.target.value })}
            className="author-input"
            placeholder="Item name"
            required
          />
        </div>
      </div>
      <div className="form-group">
        <div className="input-wrapper">
          <span className="input-icon">📝</span>
          <textarea
            value={editedItem.description}
            onChange={(e) => setEditedItem({ ...editedItem, description: e.target.value })}
            className="message-input"
            placeholder="Item description"
            rows="3"
          />
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" className="submit-btn">
          <span className="btn-icon">💾</span>
          Save
        </button>
        <button type="button" onClick={onCancel} className="cancel-btn">
          <span className="btn-icon">❌</span>
          Cancel
        </button>
      </div>
    </form>
  )
}

export default ItemsManager