import { Pool } from 'pg';

// import dotenv from 'dotenv';
// dotenv.config()

const pool = new Pool({
  database: process.env.DBNAME,
  user: process.env.DBUSER,
  password: process.env.DBPASSWORD,
});

type Book = {
  name: string;
  author: string;
  genre: string;
  year: number;
};

function generateBooks(count = 100): Book[] {
  // const arr = [];

  // for (let i = 0; i < count; i++) {
  //   arr.push({ name: 'book' + i, author: 'author' + i, genre: 'genre' + i, year: i });
  // }

  return Array.from({ length: count }, (_, i) => ({
    name: 'Book ' + i,
    author: 'Author ' + i,
    genre: 'Genre ' + i,
    year: i,
  }));

  // return new Array(count).fill(null).map((_, i) => ({
  //   name: 'Book ' + i,
  //   author: 'Author ' + i,
  //   genre: 'Genre ' + i,
  //   year: i,
  // }));
}

// ReturnType<typeof generateBooks>,

function insertBooks(books: Book[]) {
  books.forEach(
    async book =>
      await pool.query(
        'INSERT INTO books (name, author, genre, year) VALUES ($1, $2, $3, $4)',
        [book.name, book.author, book.genre, book.year],
      ),
  );
}

insertBooks(generateBooks(100));
