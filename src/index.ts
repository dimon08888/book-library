import path from 'path';
import express from 'express';
import { Pool } from 'pg';

const app = express();

app.use(express.json());
app.use('/static', express.static('public'));

const pool = new Pool({
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/api/books', async (req, res) => {
  if (Math.random() < 0.25) {
    res
      .status(429)
      .send({ message: 'You are only allowed to send 60 requests per day.' });
  } else {
    const result = await pool.query('SELECT * FROM books');
    res.send(result.rows);
  }
});

app.post('/api/books', async (req, res) => {
  const { name, author, genre, year } = req.body;
  const result = await pool.query(
    'INSERT INTO books ( name, author, genre, year ) VALUES ( $1, $2, $3, $4 ) RETURNING *',
    [name, author, genre, year],
  );
  res.status(201).send(result.rows[0]);
});

app.get('/api/books/:id', async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM books WHERE id = $1', [id]);

  if (result.rowCount === 0) {
    return res.status(404).send();
  }

  res.send(result.rows[0]);
});

app.patch('/api/books/:id', async (req, res) => {
  const { id } = req.params;
  const { name, author, genre, year } = req.body;

  const result = await pool.query('SELECT * FROM books WHERE id = $1', [id]);

  if (result.rowCount === 0) {
    return res.status(404).send();
  }

  const book = result.rows[0];

  const newName = name ?? book.name;
  const newAuthor = author ?? book.author;
  const newGenre = genre ?? book.genre;
  const newYear = year ?? book.year;

  const result2 = await pool.query(
    'UPDATE books SET name = $1, author = $2, genre = $3, year = $4 WHERE id = $5 RETURNING *',
    [newName, newAuthor, newGenre, newYear, id],
  );

  res.status(200).send(result2.rows[0]);
});

app.delete('/api/books/:id', async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('DELETE FROM books WHERE id = $1', [id]);

  if (result.rowCount === 0) {
    return res.status(404).send();
  }

  res.status(204).send();
});

app.listen(5000);

// id, name, nationality, dateOfBirth, dateOfDeath
