// client/src/utils/uploadImage.js
import api from "./api";

const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/api/upload", formData);
  return res.data.url;
};

export default uploadImage;