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

  if (loading) return <div className="loading">Loading items...</div>

  return (
    <div className="items-manager">
      <h2>Items Manager</h2>

      {error && <div className="error">{error}</div>}

      {/* Create new item form */}
      <form onSubmit={handleCreateItem} className="create-item-form">
        <h3>Add New Item</h3>
        <input
          type="text"
          placeholder="Item name"
          value={newItem.name}
          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
          required
        />
        <textarea
          placeholder="Item description"
          value={newItem.description}
          onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
        />
        <button type="submit">Create Item</button>
      </form>

      {/* Items list */}
      <div className="items-list">
        <h3>Items ({items.length})</h3>
        {items.length === 0 ? (
          <p>No items found. Create your first item above!</p>
        ) : (
          items.map(item => (
            <div key={item.id} className="item-card">
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
  )
}

function ItemDisplay({ item, onEdit, onDelete }) {
  return (
    <div className="item-display">
      <h4>{item.name}</h4>
      <p>{item.description}</p>
      <small>
        Created: {new Date(item.createdAt).toLocaleString()} |
        Updated: {new Date(item.updatedAt).toLocaleString()}
      </small>
      <div className="item-actions">
        <button onClick={onEdit} className="edit-btn">Edit</button>
        <button onClick={onDelete} className="delete-btn">Delete</button>
      </div>
    </div>
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
      <input
        type="text"
        value={editedItem.name}
        onChange={(e) => setEditedItem({ ...editedItem, name: e.target.value })}
        required
      />
      <textarea
        value={editedItem.description}
        onChange={(e) => setEditedItem({ ...editedItem, description: e.target.value })}
      />
      <div className="form-actions">
        <button type="submit">Save</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

export default ItemsManager