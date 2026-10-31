import React from 'react';


const Profile = () => {
    const [user , setUser] = useState();

    useEffect(() =>{
      const getData = async () => {
         const response = await fetch('process.env.REACT_APP_BACKEND_URL/api/linkedin/get-user', {
            method: 'get',
            credentials:'include'
         })

        const data = await response.json();

         if(response.ok){
            setUser(data?.user);
         }
      }

      getData();
    } , [])

   return (
    <div>
        <h1>Profile</h1>
        <p>Name: {user?.name}</p>
        <p>Email: {user?.email}</p>
        <p>Avatar:
           <img src = {user?.avatar} />
        </p>
    </div>
   )
}