import path from 'path';
import express from 'express';
import { Pool } from 'pg';

const app = express();
const PORT = 5000;

app.use(express.json());
app.use('/static', express.static('public'));

const pool = new Pool({
  database: process.env.DBNAME,
  user: process.env.DBUSER,
  password: process.env.DBPASSWORD,
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// api/books?ordering=name&page=1

// ordering=name
// ordering=-name

const PAGE = 1;
const PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 250;

// /api/books?q=book 25

app.get('/api/books', async (req, res) => {
  let { ordering = 'id', page = PAGE, pageSize = PAGE_SIZE, q } = req.query;
  let direction = 'ASC';

  // if (Math.random() < 0.25) {
  //   res
  //     .status(429)
  //     .send({ message: 'You are only allowed to send 60 requests per day.' });
  // } else {

  if ((ordering as string)[0] === '-') {
    direction = 'DESC';
    ordering = (ordering as string).slice(1);
  }

  const orderingFields = ['id', 'name', 'author', 'genre', 'year'];

  if (!orderingFields.includes(ordering as string)) {
    return res.status(400).send({
      ordering: [
        `This value is invalid. Valid options are: ${orderingFields.join(', ')}.`,
      ],
    });
  }

  let pageSizeNum = parseInt(pageSize as string);
  if (isNaN(pageSizeNum) || pageSizeNum < 0 || pageSizeNum > MAX_PAGE_SIZE) {
    pageSizeNum = PAGE_SIZE;
  }

  let pageNum = parseInt(page as string);
  if (isNaN(pageNum) || pageNum < 0) {
    pageNum = PAGE;
  }

  let result;
  let count;
  if (q) {
    // 'man invisible' -> [ 'man', 'invisible' ] -> ['UPPER(name) LIKE UPPER(man)', ] .join='AND'
    // const f = String(q)
    //   .split(/\s+/)
    //   .map(word => `UPPER(name) LIKE UPPER('%${word}%')`)
    //   .join(' AND ');
    // console.log('f :>> ', f);
    // WHERE (UPPER(name) LIKE UPPER(man) AND UPPER(name) LIKE UPPER(invisible))
    result = await pool.query(
      `SELECT * FROM books WHERE UPPER(name) LIKE UPPER($1) OR UPPER(author) LIKE UPPER($1) OR UPPER(genre) LIKE UPPER($1) ORDER BY ${ordering} ${direction} LIMIT $2 OFFSET $3`,
      ['%' + q + '%', pageSizeNum, (pageNum - 1) * pageSizeNum],
    );
    count = (
      await pool.query(
        'SELECT COUNT(*) FROM books WHERE UPPER(name) LIKE UPPER($1) OR UPPER(author) LIKE UPPER($1) OR UPPER(genre) LIKE UPPER($1)',
        ['%' + q + '%'],
      )
    ).rows[0].count;
  } else {
    result = await pool.query(
      `SELECT * FROM books ORDER BY ${ordering} ${direction} LIMIT $1 OFFSET $2`,
      [pageSizeNum, (pageNum - 1) * pageSizeNum],
    );
    count = (await pool.query('SELECT COUNT(*) FROM books')).rows[0].count;
  }

  // /api/books?ordering=name -> ORDER BY name ASC
  // /api/books?ordering=-name -> ORDER BY name DESC

  // ORDER BY field ASC
  // ORDER BY field DESC
  let next: string | null = `http://127.0.0.1:${PORT}/api/books?page=${pageNum + 1}`;
  if ((pageNum + 1) * pageSizeNum > count) {
    next = null;
  }

  let previous: string | null = `http://127.0.0.1:${PORT}/api/books?page=${pageNum - 1}`;
  if (pageNum - 1 < 0) {
    previous = null;
  }

  // if ((pageNum - 1) * pageSizeNum > count) {
  //   previous = null;
  // }

  res.send({
    count: Number(count),
    next: next,
    previous: previous,
    results: result.rows,
  });
});

app.post('/api/books', async (req, res) => {
  const { name, author, genre, year } = req.body;
  const result = await pool.query(
    'INSERT INTO books ( name, author, genre, year ) VALUES ( $1, $2, $3, $4 ) RETURNING *',
    [name, author, genre, year],
  );
  res.status(201).send(result.rows[0]);
});

app.delete('/api/books', async (req, res) => {
  const { id } = req.query;
  const ids = Array.isArray(id) ? id : [id];

  const result = await pool.query(
    'DELETE FROM books WHERE id IN (' + ids.map((_, i) => '$' + (i + 1)).join(', ') + ')',
    ids,
  );

  res.status(204).send();
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

app.get('/api/authors', async (req, res) => {
  const result = await pool.query('SELECT * FROM authors');
  res.send(result.rows);
});

app.post('/api/authors', async (req, res) => {
  const name = req.body.name;
  const nationality = req.body.nationality;
  const dateofbirth = req.body.dateofbirth;
  const dateofdeath = req.body.dateofdeath;
  const result = await pool.query(
    'INSERT INTO authors (name, nationality, dateofbirth, dateofdeath) VALUES ($1, $2, $3, $4) RETURNING *',
    [name, nationality, dateofbirth, dateofdeath],
  );

  res.status(201).send(result.rows[0]);
});

app.delete('/api/authors/:id', async (req, res) => {
  const id = req.params.id;
  const result = await pool.query('DELETE FROM authors WHERE id = $1', [id]);

  if (result.rowCount === 0) {
    return res.status(404).send();
  }
  res.status(204).send();
});

app.listen(PORT);

// GET
// https://google.com/search?q=dogs&locale=RU7
// req.query {
//   q: 'dogs
//   locale: 'ru7'
// }

// https - protocol.
// google.com - host.
// search - pathname.
// q=cats - query string.
// q - query string parameter.
// cats - query string value.
