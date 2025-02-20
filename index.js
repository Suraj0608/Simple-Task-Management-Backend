const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

// Application Initialization
const app = express();
const port = process.env.PORT || 5000;

// MiddleWare configuration
app.use(cors());
app.use(express.json());      // Parse incoming JSON Data 
app.use(express.urlencoded({ extended: true }));


// PostgreSQL connection
const pool = new Pool({
      user: process.env.DB_USER || 'postgres',              // DB username
      password: process.env.DB_PASSWORD || 'root',          // DB password
      database: process.env.DB_NAME || 'task_manager_app',  // DB Name
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
});

// Create 'tasks' table (if it doesn't exist)
const createTableQuery = `
CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title VARCHAR(300) NOT NULL,
      description VARCHAR(3000),
      priority VARCHAR(40) NOT NULL,
      completed BOOLEAN DEFAULT FALSE
);`;

// Execute 'createTableQuery' to create the table in DB
pool.query(createTableQuery, (err) => {
      if (err) {
            console.error('Error creating table:', err);
      } else {
            console.log('Table created successfully...');
      }
});


// Routes
// Get all tasks
app.get('/tasks', async (req, res) => {
      try {
            const result = await pool.query('SELECT * FROM tasks ORDER BY priority DESC');
            res.json(result.rows);
      } catch (error) {
            res.status(500).json({ error: 'Failed to fetch tasks' });
      }
});

// Add a new task
app.post('/tasks', async (req, res) => {
      const { title, description, priority } = req.body;
      try {
            const result = await pool.query(
                  'INSERT INTO tasks (title, description, priority, completed) VALUES ($1, $2, $3, $4) RETURNING *',
                  [title, description, priority, false]
            );
            res.json(result.rows[0]);
      } catch (error) {
            res.status(500).json({ error: 'Failed to create task' });
      }
});

// Update the task's completion status
app.put('/tasks/:id', async (req, res) => {
      const { id } = req.params;
      const { completed } = req.body;
      try {
            const result = await pool.query(
                  'UPDATE tasks SET completed = $1 WHERE id = $2 RETURNING *',
                  [completed, id]
            );
            res.json(result.rows[0]);
      } catch (error) {
            res.status(500).json({ error: 'Failed to update task' });
      }
});

// Update a task by ID
app.put('/tasks/update/:id', async (req, res) => {
      const { id } = req.params;
      const { title, description, priority } = req.body;

      try {
            // Build dynamic query to update only the fields that are provided
            const fields = [];
            const values = [];

            if (title) {
                  fields.push('title = $' + (fields.length + 1));
                  values.push(title);
            }
            if (description) {
                  fields.push('description = $' + (fields.length + 1));
                  values.push(description);
            }
            if (priority) {
                  fields.push('priority = $' + (fields.length + 1));
                  values.push(priority);
            }

            // If no fields to update, return a message
            if (fields.length === 0) {
                  return res.status(400).json({ error: 'No data provided to update' });
            }

            values.push(id); // Adding task ID to the values array at the end

            // Execute the update query
            const query = `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`;
            const result = await pool.query(query, values);

            if (result.rows.length === 0) {
                  return res.status(404).json({ error: 'Task not found' });
            }

            res.json(result.rows[0]);
      } catch (error) {
            res.status(500).json({ error: 'Failed to update task' });
      }
});

// Delete task
app.delete('/tasks/:id', async (req, res) => {
      const { id } = req.params;
      try {
            await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
            res.json({ message: 'Task deleted successfully' });
      } catch (error) {
            res.status(500).json({ error: 'Failed to delete task' });
      }
});

// Start the server
app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
});
