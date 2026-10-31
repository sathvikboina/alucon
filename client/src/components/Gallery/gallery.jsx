import { Card, Button, Form } from "react-bootstrap";
import axios from "axios";
import { useEffect, useState } from "react";
const Gallery = () => {
  const [FolderNames, setFolderNames] = useState([]);
  const [Images, setImages] = useState([]);

  useEffect(() => {
    const getData = async () => {
      const data = await axios.get(`/api/gallery/getFolders`);
      console.log("folders = ", data.data);
      setFolderNames(data.data);
    };
    getData();
  }, []);

  const getImages = async (e) => {
    e.preventDefault();
    const senddata = {
      folder_name: e.target.folder_name.value
    };
    console.log("folder_name name = ",e.target.folder_name.value);
    const data = await axios.post(`/api/gallery/getImages`, senddata);
    console.log("images = ",data)
    setImages(data)
  };


  return (
    <div className="row" style={{ minHeight: "100vh" }}>
      {FolderNames.map((ele, i) => {
        return (
          <>
            <form onSubmit={(e) => getImages(e)}>
              
                <Button
                  type="submit"
                  name="folderName"
                  variant="success"
                  value={ele.folder_name}
                >
                  {ele.folder_name}
                </Button>
             
            </form>
          </>
        );
      })}
    </div>
  );
};

export default Gallery;
