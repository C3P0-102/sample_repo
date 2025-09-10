
import os
from datetime import datetime
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'better-software-secret-key-2025')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///better_software.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
migrate = Migrate(app, db)
CORS(app, origins=['http://localhost:3000'])


class Task(db.Model):
    __tablename__ = 'tasks'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), default='pending')
    priority = db.Column(db.String(20), default='medium')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    comments = db.relationship('Comment', backref='task', lazy=True, cascade='all, delete-orphan')
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'status': self.status,
            'priority': self.priority,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'comments_count': len(self.comments) if self.comments else 0
        }
    def __repr__(self):
        return f'<Task {self.id}: {self.title}>'


class Comment(db.Model):
    __tablename__ = 'comments'
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    def to_dict(self):
        return {
            'id': self.id,
            'content': self.content,
            'task_id': self.task_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    def __repr__(self):
        return f'<Comment {self.id}: {self.content[:50]}...>'



@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        tasks_query = Task.query.order_by(Task.created_at.desc())
        tasks_paginated = tasks_query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        return jsonify({
            'tasks': [task.to_dict() for task in tasks_paginated.items],
            'total': tasks_paginated.total,
            'pages': tasks_paginated.pages,
            'current_page': page,
            'has_next': tasks_paginated.has_next,
            'has_prev': tasks_paginated.has_prev
        }), 200
    except Exception as e:
        return jsonify({'error': 'Failed to retrieve tasks', 'message': str(e)}), 500


@app.route('/api/tasks', methods=['POST'])
def create_task():
    try:
        data = request.get_json()
        if not data or not data.get('title'):
            return jsonify({'error': 'Task title is required'}), 400
        if not data['title'].strip():
            return jsonify({'error': 'Task title cannot be empty'}), 400
        task = Task(
            title=data['title'].strip(),
            description=data.get('description', '').strip(),
            status=data.get('status', 'pending'),
            priority=data.get('priority', 'medium')
        )
        db.session.add(task)
        db.session.commit()
        return jsonify({
            'message': 'Task created successfully',
            'task': task.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create task', 'message': str(e)}), 500


@app.route('/api/tasks/<int:task_id>', methods=['GET'])
def get_task(task_id):
    try:
        task = Task.query.get_or_404(task_id)
        return jsonify({'task': task.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': 'Task not found', 'message': str(e)}), 404


@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    try:
        task = Task.query.get_or_404(task_id)
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        if 'title' in data:
            if not data['title'].strip():
                return jsonify({'error': 'Task title cannot be empty'}), 400
            task.title = data['title'].strip()
        if 'description' in data:
            task.description = data['description'].strip()
        if 'status' in data:
            task.status = data['status']
        if 'priority' in data:
            task.priority = data['priority']
        task.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify({
            'message': 'Task updated successfully',
            'task': task.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update task', 'message': str(e)}), 500


@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    try:
        task = Task.query.get_or_404(task_id)
        db.session.delete(task)
        db.session.commit()
        return jsonify({'message': 'Task deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete task', 'message': str(e)}), 500



@app.route('/api/tasks/<int:task_id>/comments', methods=['GET'])
def get_comments(task_id):
    try:
        task = Task.query.get_or_404(task_id)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        comments_query = Comment.query.filter_by(task_id=task_id).order_by(Comment.created_at.desc())
        comments_paginated = comments_query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        return jsonify({
            'comments': [comment.to_dict() for comment in comments_paginated.items],
            'total': comments_paginated.total,
            'pages': comments_paginated.pages,
            'current_page': page,
            'per_page': per_page,
            'has_next': comments_paginated.has_next,
            'has_prev': comments_paginated.has_prev
        }), 200
    except Exception as e:
        return jsonify({'error': 'Failed to retrieve comments', 'message': str(e)}), 500


@app.route('/api/tasks/<int:task_id>/comments', methods=['POST'])
def create_comment(task_id):
    try:
        task = Task.query.get_or_404(task_id)
        data = request.get_json()
        if not data or not data.get('content'):
            return jsonify({'error': 'Comment content is required'}), 400
        if not data['content'].strip():
            return jsonify({'error': 'Comment content cannot be empty'}), 400
        comment = Comment(
            content=data['content'].strip(),
            task_id=task_id
        )
        db.session.add(comment)
        db.session.commit()
        return jsonify({
            'message': 'Comment created successfully',
            'comment': comment.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create comment', 'message': str(e)}), 500


@app.route('/api/comments/<int:comment_id>', methods=['GET'])
def get_comment(comment_id):
    try:
        comment = Comment.query.get_or_404(comment_id)
        return jsonify({'comment': comment.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': 'Comment not found', 'message': str(e)}), 404


@app.route('/api/comments/<int:comment_id>', methods=['PUT'])
def update_comment(comment_id):
    try:
        comment = Comment.query.get_or_404(comment_id)
        data = request.get_json()
        if not data or not data.get('content'):
            return jsonify({'error': 'Comment content is required'}), 400
        if not data['content'].strip():
            return jsonify({'error': 'Comment content cannot be empty'}), 400
        comment.content = data['content'].strip()
        comment.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify({
            'message': 'Comment updated successfully',
            'comment': comment.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update comment', 'message': str(e)}), 500


@app.route('/api/comments/<int:comment_id>', methods=['DELETE'])
def delete_comment(comment_id):
    try:
        comment = Comment.query.get_or_404(comment_id)
        db.session.delete(comment)
        db.session.commit()
        return jsonify({'message': 'Comment deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete comment', 'message': str(e)}), 500



@app.route('/')
def index():
    return jsonify({
        'message': 'Better Software Assessment API',
        'status': 'running',
        'endpoints': {
            'tasks': '/api/tasks',
            'task_comments': '/api/tasks/<task_id>/comments',
            'comments': '/api/comments/<comment_id>'
        }
    })



@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Resource not found'}), 404

@app.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad request'}), 400

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500



def init_db():
    with app.app_context():
        db.create_all()
        if Task.query.count() == 0:
            task1 = Task(
                title='Build Comment API',
                description='Implement CRUD operations for task comments',
                status='in_progress',
                priority='high'
            )
            task2 = Task(
                title='Create React Frontend',
                description='Build React components for task and comment management',
                status='pending',
                priority='medium'
            )
            task3 = Task(
                title='Write Tests',
                description='Create comprehensive test suite for the application',
                status='completed',
                priority='high'
            )
            db.session.add_all([task1, task2, task3])
            db.session.commit()
            comment1 = Comment(
                content='Started working on the comment model and basic CRUD operations.',
                task_id=task1.id
            )
            comment2 = Comment(
                content='API endpoints are working well. Need to add proper validation.',
                task_id=task1.id
            )
            comment3 = Comment(
                content='Planning the React component structure.',
                task_id=task2.id
            )
            db.session.add_all([comment1, comment2, comment3])
            db.session.commit()
            print("Sample data created successfully!")



if __name__ == '__main__':
    init_db()
    print("Starting Better Software Assessment API...")
    print("Backend running on: http://localhost:5000")
    print("API Documentation available at: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)