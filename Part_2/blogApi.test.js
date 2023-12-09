const axios = require("axios");
const { Console } = require("console");

describe("Blog API Tests", () => {
  const apiUrl = "http://localhost:3000";

  describe("Get All Blog Posts Tests", () => {
    test("Get all blog posts", async () => {
      const response = await axios.get(`${apiUrl}/get-all-blog-posts`);
      expect(response.status).toBe(200);
    });
  });

  describe("Generate Token and Get Image Tests", () => {
    let token = "";

    test("Get token for image successful", async () => {
      const response = await axios.post(`${apiUrl}/generate-image-token`, {
        image_path: "images/main_image_1_test.jpg",
      });
      token = response.data.token;
      expect(response.status).toBe(200);
    });

    test("Take token and send to Get image by token API successful", async () => {
      const getImageResponse = await axios.post(
        `${apiUrl}/get-image-by-token`,
        {
          image_path: "images/main_image_1_test.jpg",
          token,
        }
      );
      expect(getImageResponse.status).toBe(200);
    });
  });

  describe("Add Blog Post Tests", () => {
    test("Add blog post succeeded", async () => {
      const response = await axios.post(`${apiUrl}/add-blog-post`, {
        title: "Sample Blog Post 3",
        description: "This is a sample blog post 3",
        main_image:
          "https://contentgrid.homedepot-static.com/hdus/en_US/DTCCOMNEW/Articles/discover-the-secret-language-of-flowers-2022-thumbnail.jpeg",
        additional_images: [
          "https://contentgrid.homedepot-static.com/hdus/en_US/DTCCOMNEW/Articles/discover-the-secret-language-of-flowers-2022-thumbnail.jpeg",
        ],
        date_time: Math.floor(Date.now() / 1000),
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("title", "Sample Blog Post 3");
    });

    test("Add blog post failed: Add partial blog post fields ", async () => {
      const response = await axios.post(`${apiUrl}/add-blog-post`, {
        title: "Sample Blog Post 3$#$#$@#$",
        description: "",
        main_image:
          "https://contentgrid.homedepot-static.com/hdus/en_US/DTCCOMNEW/Articles/discover-the-secret-language-of-flowers-2022-thumbnail.jpeg",
        additional_images: [
          "https://contentgrid.homedepot-static.com/hdus/en_US/DTCCOMNEW/Articles/discover-the-secret-language-of-flowers-2022-thumbnail.jpeg",
        ],
        date_time: Math.floor(Date.now() / 1000),
      });

      expect(response.status).toBe(400);
    });
  });
});
