import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';


const API_BASE_URL = 'http://localhost:5000';

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString();
};

const formatDateShort = (dateString) => {
  return new Date(dateString).toLocaleDateString();
};



const CommentForm = ({ taskId, comment, onCommentAdded, onCommentUpdated, onCancel }) => {
  const [content, setContent] = useState(comment ? comment.content : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isEditing = !!comment;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Comment content is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const url = isEditing 
        ? `${API_BASE_URL}/api/comments/${comment.id}` 
        : `${API_BASE_URL}/api/tasks/${taskId}/comments`;
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save comment');
      }

      const data = await response.json();
      
      if (isEditing) {
        onCommentUpdated(data.comment);
      } else {
        onCommentAdded(data.comment);
      }
      
      setContent('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="comment-form">
      <div className="form-group">
        <label htmlFor="comment-content">
          {isEditing ? 'Edit Comment' : 'Add Comment'}
        </label>
        <textarea
          id="comment-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your comment..."
          rows="3"
          className="form-control"
          disabled={isSubmitting}
        />
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="form-actions">
        <button 
          type="submit" 
          className="btn btn-primary btn-sm"
          disabled={isSubmitting || !content.trim()}
        >
          {isSubmitting ? 'Saving...' : (isEditing ? 'Update' : 'Add Comment')}
        </button>
        <button 
          type="button" 
          className="btn btn-secondary btn-sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

const CommentItem = ({ 
  comment, 
  isEditing, 
  onEdit, 
  onCancelEdit, 
  onCommentUpdated, 
  onCommentDeleted 
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    setIsDeleting(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/comments/${comment.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete comment');
      }

      onCommentDeleted(comment.id);
    } catch (err) {
      alert('Failed to delete comment: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isEditing) {
    return (
      <div className="comment-item editing">
        <CommentForm
          comment={comment}
          onCommentUpdated={onCommentUpdated}
          onCancel={onCancelEdit}
        />
      </div>
    );
  }

  return (
    <div className="comment-item">
      <div className="comment-content">
        <p>{comment.content}</p>
      </div>
      
      <div className="comment-meta">
        <small className="comment-date">
          Created: {formatDate(comment.created_at)}
          {comment.updated_at !== comment.created_at && (
            <> • Updated: {formatDate(comment.updated_at)}</>
          )}
        </small>
      </div>
      
      <div className="comment-actions">
        <button 
          className="btn btn-sm btn-outline-primary"
          onClick={onEdit}
        >
          Edit
        </button>
        <button 
          className="btn btn-sm btn-outline-danger"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
};

const CommentList = ({ taskId }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingComment, setEditingComment] = useState(null);

  useEffect(() => {
    if (taskId) {
      fetchComments();
    }
  }, [taskId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      
      const data = await response.json();
      setComments(data.comments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCommentAdded = (newComment) => {
    setComments([newComment, ...comments]);
    setShowForm(false);
  };

  const handleCommentUpdated = (updatedComment) => {
    setComments(comments.map(comment => 
      comment.id === updatedComment.id ? updatedComment : comment
    ));
    setEditingComment(null);
  };

  const handleCommentDeleted = (commentId) => {
    setComments(comments.filter(comment => comment.id !== commentId));
  };

  if (loading) return <div className="loading">Loading comments...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="comments-section">
      <div className="comments-header">
        <h4>Comments ({comments.length})</h4>
        <button 
          className="btn btn-primary btn-sm"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : 'Add Comment'}
        </button>
      </div>

      {showForm && (
        <CommentForm
          taskId={taskId}
          onCommentAdded={handleCommentAdded}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="comments-list">
        {comments.length === 0 ? (
          <p className="no-comments">No comments yet. Be the first to comment!</p>
        ) : (
          comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              isEditing={editingComment === comment.id}
              onEdit={() => setEditingComment(comment.id)}
              onCancelEdit={() => setEditingComment(null)}
              onCommentUpdated={handleCommentUpdated}
              onCommentDeleted={handleCommentDeleted}
            />
          ))
        )}
      </div>
    </div>
  );
};



const TaskForm = ({ task, onTaskAdded, onTaskUpdated, onCancel }) => {
  const [title, setTitle] = useState(task ? task.title : '');
  const [description, setDescription] = useState(task ? task.description : '');
  const [status, setStatus] = useState(task ? task.status : 'pending');
  const [priority, setPriority] = useState(task ? task.priority : 'medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isEditing = !!task;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const url = isEditing 
        ? `${API_BASE_URL}/api/tasks/${task.id}` 
        : `${API_BASE_URL}/api/tasks`;
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title: title.trim(), 
          description: description.trim(),
          status,
          priority
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save task');
      }

      const data = await response.json();
      
      if (isEditing) {
        onTaskUpdated(data.task);
      } else {
        onTaskAdded(data.task);
      }
      
      // Reset form
      setTitle('');
      setDescription('');
      setStatus('pending');
      setPriority('medium');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="task-form">
      <div className="form-group">
        <label htmlFor="title">Title *</label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter task title..."
          className="form-control"
          disabled={isSubmitting}
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter task description..."
          rows="3"
          className="form-control"
          disabled={isSubmitting}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="form-control"
            disabled={isSubmitting}
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="priority">Priority</label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="form-control"
            disabled={isSubmitting}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="form-actions">
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={isSubmitting || !title.trim()}
        >
          {isSubmitting ? 'Saving...' : (isEditing ? 'Update Task' : 'Create Task')}
        </button>
        <button 
          type="button" 
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

const TaskItem = ({ 
  task, 
  isSelected, 
  isEditing, 
  onSelect, 
  onEdit, 
  onCancelEdit, 
  onTaskUpdated, 
  onTaskDeleted 
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task? This will also delete all associated comments.')) {
      return;
    }

    setIsDeleting(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${task.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete task');
      }

      onTaskDeleted(task.id);
    } catch (err) {
      alert('Failed to delete task: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#28a745';
      case 'in_progress': return '#ffc107';
      case 'pending': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#dc3545';
      case 'medium': return '#fd7e14';
      case 'low': return '#20c997';
      default: return '#6c757d';
    }
  };

  if (isEditing) {
    return (
      <div className="task-item editing">
        <TaskForm
          task={task}
          onTaskUpdated={onTaskUpdated}
          onCancel={onCancelEdit}
        />
      </div>
    );
  }

  return (
    <div className={`task-item ${isSelected ? 'selected' : ''}`} onClick={onSelect}>
      <div className="task-header">
        <h4 className="task-title">{task.title}</h4>
        <div className="task-badges">
          <span 
            className="badge status-badge" 
            style={{ backgroundColor: getStatusColor(task.status) }}
          >
            {task.status.replace('_', ' ')}
          </span>
          <span 
            className="badge priority-badge" 
            style={{ backgroundColor: getPriorityColor(task.priority) }}
          >
            {task.priority}
          </span>
        </div>
      </div>
      
      {task.description && (
        <p className="task-description">{task.description}</p>
      )}
      
      <div className="task-meta">
        <small className="task-date">
          Created: {formatDateShort(task.created_at)}
        </small>
        <small className="comments-count">
          {task.comments_count || 0} comment{task.comments_count !== 1 ? 's' : ''}
        </small>
      </div>
      
      <div className="task-actions" onClick={(e) => e.stopPropagation()}>
        <button 
          className="btn btn-sm btn-outline-primary"
          onClick={onEdit}
        >
          Edit
        </button>
        <button 
          className="btn btn-sm btn-outline-danger"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
};

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/tasks`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskAdded = (newTask) => {
    setTasks([newTask, ...tasks]);
    setShowForm(false);
  };

  const handleTaskUpdated = (updatedTask) => {
    setTasks(tasks.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ));
    setEditingTask(null);
    if (selectedTask && selectedTask.id === updatedTask.id) {
      setSelectedTask(updatedTask);
    }
  };

  const handleTaskDeleted = (taskId) => {
    setTasks(tasks.filter(task => task.id !== taskId));
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask(null);
    }
  };

  if (loading) return <div className="loading">Loading tasks...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="task-management">
      <div className="tasks-panel">
        <div className="tasks-header">
          <h2>Tasks ({tasks.length})</h2>
          <button 
            className="btn btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel' : 'Add Task'}
          </button>
        </div>

        {showForm && (
          <TaskForm
            onTaskAdded={handleTaskAdded}
            onCancel={() => setShowForm(false)}
          />
        )}

        <div className="tasks-list">
          {tasks.length === 0 ? (
            <p className="no-tasks">No tasks yet. Create your first task!</p>
          ) : (
            tasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                isSelected={selectedTask && selectedTask.id === task.id}
                isEditing={editingTask === task.id}
                onSelect={() => setSelectedTask(task)}
                onEdit={() => setEditingTask(task.id)}
                onCancelEdit={() => setEditingTask(null)}
                onTaskUpdated={handleTaskUpdated}
                onTaskDeleted={handleTaskDeleted}
              />
            ))
          )}
        </div>
      </div>

      <div className="comments-panel">
        {selectedTask ? (
          <div>
            <div className="selected-task-header">
              <h3>Comments for: "{selectedTask.title}"</h3>
              <span className="task-status">{selectedTask.status}</span>
            </div>
            <CommentList taskId={selectedTask.id} />
          </div>
        ) : (
          <div className="no-task-selected">
            <h3>Select a task to view comments</h3>
            <p>Click on any task from the left panel to view and manage its comments.</p>
          </div>
        )}
      </div>
    </div>
  );
};



const App = () => {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Better Software Assessment</h1>
        <p>Task and Comment Management System</p>
      </header>
      <main className="App-main">
        <TaskList />
      </main>
    </div>
  );
};


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);