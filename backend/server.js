const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(cors({
  origin: ['http://localhost:3001', 'https://your-github-pages-url.github.io'], // will add frontend url later
  credentials: true,
}));
app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, '../')));

// Serve PDFs
app.use('/pdfs', express.static(path.join(__dirname, 'uploads')));

// Upload endpoint
app.post('/upload', upload.single('pdf'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ url: `/pdfs/${req.file.filename}` });
});

async function searchLibGen(query) {
  const searchUrl = `http://libgen.rs/search.php?req=${encodeURIComponent(query)}&lg_topic=libgen&open=0&view=simple&res=25&phrase=1&column=def`;
  const response = await axios.get(searchUrl);
  const $ = cheerio.load(response.data);

  const books = [];
  $('table.c tbody tr').each((i, row) => {
    const title = $(row).find('td:nth-child(3)').text().trim();
    const author = $(row).find('td:nth-child(2)').text().trim();
    const md5Link = $(row).find('td:nth-child(10) a').attr('href');
    if (md5Link) {
      const md5 = md5Link.split('md5=')[1];
      const coverUrl = `https://covers.libgen.rs/cover/${md5}`;
      books.push({ title, author, md5, coverUrl });
    }
  });

  console.log('Books from LibGen:', books); // Debugging: Log the books
  return books;
}

async function downloadBook(md5, title) {
  try {
    const downloadUrl = `http://libgen.gs/ads.php?md5=${md5}`;
    const response = await axios.get(downloadUrl);
    const $ = cheerio.load(response.data);

    // Extract the download link
    const downloadLinks = $('a[href*="get.php"]').map((i, el) => $(el).attr('href')).get();
    if (!downloadLinks.length) {
      throw new Error('No download link found');
    }

    const getUrl = `https://libgen.gs/${downloadLinks[0]}`;
    const redirectResponse = await axios.get(getUrl, {
      headers: {
        'Referer': 'https://libgen.gs/',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36'
      },
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400
    });

    const redirectUrl = redirectResponse.headers.location;
    if (!redirectUrl) {
      throw new Error('Failed to get redirect URL');
    }

    // Download the actual file
    const fileResponse = await axios.get(redirectUrl, {
      responseType: 'arraybuffer',
      headers: {
        'Referer': getUrl,
        'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36'
      }
    });

    const fileName = `${Date.now()}_${title}.pdf`;
    const filePath = path.join(__dirname, 'uploads', fileName);
    fs.writeFileSync(filePath, fileResponse.data);

    return fileName;
  } catch (error) {
    console.error('Error downloading book:', error);
    throw new Error('Failed to download book');
  }
}

async function fetchBookDetails(md5) {
  const detailsUrl = `http://library.lol/main/${md5}`;
  const response = await axios.get(detailsUrl);
  const $ = cheerio.load(response.data);

  // Extract the cover image URL
  const coverUrl = $('img#cover').attr('src') || './icons/placeholder-cover.jpg';
  return coverUrl;
}

// Search and scrape endpoint
app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'No search query provided' });
  }

  try {
    const books = await searchLibGen(query);
    res.json(books);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

app.get('/download', async (req, res) => {
  const { md5, title } = req.query;
  if (!md5 || !title) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    const downloadUrl = `http://library.lol/main/${md5}`;
    const response = await axios.get(downloadUrl, { responseType: 'arraybuffer' });

    const fileName = `${Date.now()}_${title}.pdf`;
    const filePath = path.join(__dirname, 'uploads', fileName);
    fs.writeFileSync(filePath, response.data);

    res.json({ url: `/pdfs/${fileName}` });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to download book' });
  }
});

app.get('/book-details', async (req, res) => {
  const { md5 } = req.query;
  if (!md5) {
    return res.status(400).json({ error: 'Missing MD5 parameter' });
  }

  try {
    const coverUrl = await fetchBookDetails(md5);
    res.json({ coverUrl });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch book details' });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
