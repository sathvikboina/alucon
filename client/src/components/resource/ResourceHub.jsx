import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import "./ResourceHub.css";

const ResourceHub = () => {

const [title,setTitle]=useState("");
const [topic,setTopic]=useState("General");
const [file,setFile]=useState(null);
const [resources,setResources]=useState([]);
const [filter,setFilter]=useState("");
const [loading,setLoading]=useState(false);

const user = JSON.parse(
 localStorage.getItem("_user_data") || "{}"
);

const currentUserId = user?._id;


// ================= FETCH =================

const fetchResources = useCallback(async()=>{

try{

 const res = await axios.get(
   "/api/resources",
   filter ? {params:{topic:filter}} : {}
 );

 setResources(res.data);

}catch(err){
 console.error(err);
}

},[filter]);

useEffect(()=>{
 fetchResources();
},[fetchResources]);



// ================= UPLOAD =================

const handleUpload = async(e)=>{
e.preventDefault();

if(!file || loading) return;

setLoading(true);

const formData = new FormData();

formData.append("file",file);
formData.append("title",title);
formData.append("topic",topic);

try{

await axios.post(
"/api/resources/upload",
formData,
{
headers:{
"x-auth-token":localStorage.getItem("token")
}
}
);

setTitle("");
setTopic("General");
setFile(null);

document.querySelector(
'input[type="file"]'
).value="";

fetchResources();

}catch(err){
console.error(
err.response?.data || err.message
);
}
finally{
setLoading(false);
}

};


// ================= DELETE =================

const deleteResource = async(id)=>{

const confirmDelete = window.confirm(
"Are you sure you want to delete?"
);

if(!confirmDelete) return;

try{

await axios.delete(
`/api/resources/${id}`,
{
headers:{
"x-auth-token":localStorage.getItem("token")
}
}
);

setResources(prev=>
prev.filter(r=>r._id!==id)
);

}catch(err){
console.error(
err.response?.data || err.message
);
}

};


// ================= DOWNLOAD =================

const handleDownload = async (url, title) => {
  try {
    // Fetch the file as a blob to bypass cross-origin download restrictions
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");
    
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = blobUrl;
    
    // Ensure proper extension is added if missing
    let fileName = title || "resource";
    const lowerUrl = url.toLowerCase();
    
    // Cloudinary raw files don't always have .pdf in the URL
    const isPDF = lowerUrl.includes('/raw/') || lowerUrl.includes('.pdf');
    
    if (isPDF && !fileName.toLowerCase().endsWith('.pdf')) {
      fileName += '.pdf';
    } else if (lowerUrl.includes('.jpg') && !fileName.toLowerCase().endsWith('.jpg')) {
      fileName += '.jpg';
    } else if (lowerUrl.includes('.png') && !fileName.toLowerCase().endsWith('.png')) {
      fileName += '.png';
    } else if (lowerUrl.includes('.jpeg') && !fileName.toLowerCase().endsWith('.jpeg')) {
      fileName += '.jpeg';
    }
    
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
    
  } catch (err) {
    console.error("Blob download failed, using fallback:", err);
    // Fallback to normal link behavior
    const link = document.createElement("a");
    link.href = url;
    
    let fileName = title || "resource";
    const lowerUrl = url.toLowerCase();
    const isPDF = lowerUrl.includes('/raw/') || lowerUrl.includes('.pdf');
    
    if (isPDF && !fileName.toLowerCase().endsWith('.pdf')) {
      fileName += '.pdf';
    }
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};


// ================= VIEW =================

const handleView = async (e, url) => {
  e.preventDefault();
  
  const lowerUrl = url.toLowerCase();
  const isPDF = lowerUrl.includes('/raw/') || lowerUrl.includes('.pdf');
  
  if (isPDF) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Network response was not ok");
      
      // Read as arrayBuffer and create a blob with explicit application/pdf type
      // This forces the browser to open it in its built-in PDF viewer
      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: "application/pdf" });
      const blobUrl = window.URL.createObjectURL(blob);
      
      window.open(blobUrl, "_blank");
      
      // Cleanup after a delay since the new tab needs time to load it
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 60000);
      
    } catch (err) {
      console.error("View as PDF failed, using fallback:", err);
      window.open(url, "_blank");
    }
  } else {
    // For images or non-PDF files, just open normally
    window.open(url, "_blank");
  }
};



return(

<div className="resource-container">

<div className="resource-header">

<h2 className="resource-title">
Resource Hub
</h2>

<p className="resource-subtitle">
Share and explore useful materials from the community
</p>

</div>



<form
onSubmit={handleUpload}
className="resource-form"
>

<input
type="text"
placeholder="Title"
value={title}
onChange={(e)=>
setTitle(e.target.value)
}
required
/>


<select
value={topic}
onChange={(e)=>
setTopic(e.target.value)
}
>

<option value="General">
General
</option>

<option value="Placement">
Placement
</option>

<option value="Higher Studies">
Higher Studies
</option>

<option value="Research">
Research
</option>

</select>



<input
type="file"
accept=".jpg,.jpeg,.png,.pdf"
onChange={(e)=>
setFile(e.target.files[0])
}
required
/>


<button
type="submit"
disabled={loading}
>
{loading ? "Uploading..." : "Upload"}
</button>

</form>




<div className="resource-filter">

<label>
Filter by Topic:
</label>

<select
onChange={(e)=>
setFilter(e.target.value)
}
>

<option value="">All</option>

<option value="Placement">
Placement
</option>

<option value="Higher Studies">
Higher Studies
</option>

<option value="Research">
Research
</option>

<option value="General">
General
</option>

</select>

</div>





<div className="resource-grid">

{resources.map((res)=>{

const isPDF=
res.fileUrl.includes("/raw/")
||
res.fileUrl.toLowerCase().includes(".pdf");


return(

<div
className="resource-card"
key={res._id}
>

<h4>
{res.title}
</h4>


<p>
<strong>Topic:</strong>{" "}
{res.topic}
</p>


<p>
<strong>Uploaded By:</strong>{" "}
{res.uploadedBy?.name || "Unknown"}
</p>



{isPDF ? (

<div className="pdf-box">
📄 PDF File
</div>

):(

<img
src={res.fileUrl}
alt="resource"
className="resource-image"
/>

)}



<div className="resource-actions">


<button
type="button"
className="view-btn"
onClick={(e)=>handleView(e, res.fileUrl)}
>
View
</button>



<button
type="button"
className="download-btn"
onClick={()=>
handleDownload(
res.fileUrl,
res.title
)
}
>
Download
</button>



{res.uploadedBy?._id===currentUserId && (

<button
type="button"
className="delete-btn"
onClick={()=>
deleteResource(res._id)
}
>
Delete
</button>

)}


</div>

</div>

);

})}

</div>

</div>

);

};

export default ResourceHub;