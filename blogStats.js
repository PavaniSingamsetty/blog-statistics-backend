const express = require('express');
const axios = require('axios');
const _ = require('lodash');
const cache = require('./cache');

const app = express();
const port = 3000;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });

app.use(express.json());

let blogs = [];

async function fetchAndAnalyzeBlogData() {
  try {
    // Make the provided curl request to fetch blog data
    const response = await axios.get('https://intent-kit-16.hasura.app/api/rest/blogs', {
      headers: {
        'x-hasura-admin-secret': '32qR4KmXOIpsGPQKMqEJHGJS27G5s7HdSKO3gdtQd2kv5e852SiYwWNfxkZOBuQ6',
      },
    });

    blogs = response.data.blogs; // Assuming the data is an array of blog objects
    
    // Calculate statistics using Lodash
    const totalBlogs = blogs.length;
    const longestBlog = _.maxBy(blogs, 'title.length');
    const blogsWithPrivacy = _.filter(blogs, (blog) =>
      _.includes(_.toLower(blog.title), 'privacy')
    );
    const uniqueTitles = _.uniqBy(blogs, 'title');

    // Create a response object
    const stats = {
      totalBlogs,
      longestBlog: longestBlog.title,
      blogsWithPrivacy: blogsWithPrivacy.length,
      uniqueTitles: uniqueTitles.map((blog) => blog.title),
    };

    return stats;
  } catch (error) {
    console.error(error);
    throw new Error('An error occurred while fetching or analyzing data.');
  }
}

const memoizedFetchAndAnalyzeBlogData = cache.memoizeWithExpiration(fetchAndAnalyzeBlogData, 60000);

app.get('/api/blog-stats', async (req, res) => {
  try {
    const stats = await memoizedFetchAndAnalyzeBlogData();

    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching or analyzing data.' });
  }
});

function search(query) {
    const matchingBlogs = [];
  
    for (const blog of blogs) {
      if (blog.title.toLowerCase().includes(query)) {
        matchingBlogs.push(blog);
      }
    }
  
    return matchingBlogs;
  }

const memoizedSearch = cache.memoizeWithExpiration(search, 60000);

app.post('/api/blog-search', (req, res) => {
    const query = req.body.query;
  
    if (!query) {
      return res.status(400).json({ error: 'The "query" field is required in the request body.' });
    }
  
    try {
      const matchingBlogs = memoizedSearch(query.toLowerCase()); 
  
      res.json(matchingBlogs);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred while searching for blogs.' });
    }
  });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

