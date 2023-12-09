const express = require("express");
const { body, validationResult } = require("express-validator");
const sharp = require("sharp");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const app = express();
app.use(express.json());
const port = 3000;
let referenceNumber = 1;

const blogsFilePath = "blogs.json";
let blogPosts = loadBlogPosts();

function loadBlogPosts() {
  try {
    const rawData = fs.readFileSync(blogsFilePath);
    return JSON.parse(rawData);
  } catch (error) {
    console.error(error);
    return [];
  }
}

// Function to generate a new reference based on the previous one
function generateNewReference(existingData) {
  const lastReference = existingData[existingData.length - 1].reference;
  const newReferenceNumber = parseInt(lastReference, 10) + 1;
  const newReference = newReferenceNumber.toString().padStart(5, "0");
  return newReference;
}

// Middleware for image token generation
const generateImageToken = (req, res, next) => {
  const { image_path } = req.body;
  req.imageToken = jwt.sign({ image_path }, "secret_key", { expiresIn: "5m" });
  next();
};

// Middleware for image token verification
const verifyImageToken = (req, res, next) => {
  const { image_path, token } = req.body;
  try {
    const decoded = jwt.verify(token, "secret_key");
    if (decoded.image_path === image_path) {
      next();
    } else {
      res
        .status(401)
        .json({ error: "Invalid token for the provided image path" });
    }
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Validate URL and compress image middleware
const validateURLAndCompressImage = async (req, res, next) => {
  const { main_image, additional_images } = req.body;

  // Validate main image URL
  if (!main_image || !main_image.match(/^https?:\/\/\S+$/)) {
    return res.status(400).json({ error: "Invalid main image URL" });
  }

  // Compress main image by 25%
  try {
    req.compressedMainImage = await sharp(await getImageBuffer(main_image))
      .jpeg({ quality: 75 })
      .toBuffer();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to compress main image" });
  }

  // Compress additional images by 25% if present
  req.compressedAdditionalImages = [];
  if (additional_images && Array.isArray(additional_images)) {
    for (const imageUrl of additional_images) {
      try {
        const compressedImage = await sharp(await getImageBuffer(imageUrl))
          .jpeg({ quality: 75 })
          .toBuffer();
        req.compressedAdditionalImages.push({ imageUrl, compressedImage });
      } catch (error) {
        console.error(error);
        return res
          .status(500)
          .json({ error: "Failed to compress additional image" });
      }
    }
  }

  next();
};

const getImageBuffer = async (imageUrl) => {
  const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
  return Buffer.from(response.data, "binary");
};

// Add blog post API
app.post(
  "/add-blog-post",
  [
    body("title")
      .notEmpty()
      .isLength({ min: 5, max: 50 })
      .matches(/^[a-zA-Z0-9\s]+$/)
      .withMessage("Invalid title"),
    body("description")
      .notEmpty()
      .isLength({ max: 500 })
      .withMessage("Description is too long"),
    body("main_image").notEmpty().isURL().withMessage("Invalid main image URL"),
    body("additional_images.*")
      .optional({ nullable: true })
      .isURL()
      .withMessage("Invalid additional image URL"),
    body("date_time").notEmpty().isInt().withMessage("Invalid date_time"),
  ],
  validateURLAndCompressImage,
  (req, res) => {
    debugger;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const referenceNumber = generateNewReference(blogPosts);

    // Save blog post data
    const blogPost = {
      title: req.body.title,
      description: req.body.description,
      main_image: `images/main_image_${referenceNumber}.jpg`, // Use compressed main image
      additional_images: req.compressedAdditionalImages.map((entry, i) => {
        const additionalImagePath = `images/additional_image_${referenceNumber}_${
          i + 1
        }.jpg`;
        fs.writeFileSync(additionalImagePath, entry.compressedImage);
        return additionalImagePath;
      }),
      date_time: req.body.date_time,
      reference: referenceNumber,
    };

    // Save compressed main image to 'images/' folder
    const mainImagePath = `images/main_image_${referenceNumber}.jpg`;
    fs.writeFileSync(mainImagePath, req.compressedMainImage);

    // Save blog post data to 'blogs.json'
    blogPosts.push(blogPost);
    fs.writeFileSync("blogs.json", JSON.stringify(blogPosts));

    res.json(blogPost);
  }
);
// Get all blog posts API
app.get("/get-all-blog-posts", (req, res) => {
  try {
    // Read all blog posts from 'blogs.json'
    const rawData = fs.readFileSync("blogs.json");
    blogPosts = JSON.parse(rawData);

    // Format 'date_time' and add 'title_slug'
    const formattedBlogPosts = blogPosts.map((blogPost) => ({
      ...blogPost,
      date_time: new Date(blogPost.date_time * 1000),
      title_slug: slugify(blogPost.title),
    }));

    // Return formatted blog posts
    res.json(formattedBlogPosts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Utility function to slugify titles
const slugify = (title) => {
  return title.toLowerCase().replace(/\s+/g, "_");
};

// Generate timed token for images API
app.post("/generate-image-token", generateImageToken, (req, res) => {
  res.json({ token: req.imageToken });
});

// Get image by token API
app.post("/get-image-by-token", verifyImageToken, (req, res) => {
  try {
    const { image_path } = req.body;
    const imageContent = fs.readFileSync(image_path);
    res.setHeader("Content-Type", "image/jpeg");
    res.send(imageContent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const server = app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

module.exports = { server };
