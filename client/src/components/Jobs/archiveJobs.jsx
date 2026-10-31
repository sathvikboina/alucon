import { Card, Button, Form } from "react-bootstrap";
import axios from "axios";
import { useEffect, useState } from "react";
const Job = () => {
  const [ArchiveJobData, setArchiveJobData] = useState([]);

  useEffect(() => {
    const getData = async () => {
      const data = await axios.get(`/api/job/get/getjob`);
      console.log("d = ", data.data);
      let DataArchive=data.data.archive.reverse();
      setArchiveJobData(DataArchive);
    };

    getData();
  }, []);

  let userData = localStorage.getItem("_user_data");
  userData = JSON.parse(userData);

  const userID = userData._id;
  const userName = userData.name;
  const userRole = userData.role;

 

  const deleteJob = async (e) => {
    e.preventDefault();
    const senddata = {
      userID: userID,
      userRole: userRole,
      jobID: e.target.jobid.value,
    };
    // console.log("id = ",e.target.jobid.value);
    const data = await axios.post(`/api/job/deletejob`, senddata);
    console.log(data.data.invalid_msg);
    if (data.data.invalid_msg == "invalid") {
      alert("invalid");
    } else {
      window.location.reload(false);
    }
  };

  const generateLink = (link) => {
    return `/profile/${link}`;
  };

  
  return (
    <div className="row" style={{ minHeight: "100vh" }}>
        { ArchiveJobData.map((ele) => {
            return (
              <Card style={{ width: "35%", margin: "15px", height: "auto" }}>
                <Card.Body>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Card.Text>
                      <a
                        style={{ fontWeight: "900" }}
                        href={generateLink(ele.userID)}
                        target="_blank"
                      >
                        {ele.created_by_user}
                      </a>
                    </Card.Text>
                    {/* <Card.Text>created at -  {formatDate(ele.Job_post_date)} </Card.Text> */}
                    <Card.Text style={{ fontSize: "10px" }}>
                      created at - {ele.Job_post_date.slice(0, 10)}
                    </Card.Text>
                  </div>

                  <Card.Title>{ele.Job_name}</Card.Title>
                  <Card.Text> {ele.Description}</Card.Text>
                  <Card.Text>
                    Deadline - {ele.Job_deadline.slice(0, 10)}
                  </Card.Text>

                  <div
                    className="row"
                    style={{ display: "flex", justifyContent: "space-evenly" }}
                  >
                    <div className="col">
                      <Card.Text>
                        <Button>
                          <a
                            href={ele.Link}
                            target="_blank"
                            style={{ color: "white" }}
                          >
                            Apply here
                          </a>
                        </Button>
                      </Card.Text>
                    </div>

                    <div className="col">
                      <Card.Text>
                        <form onSubmit={(e) => deleteJob(e)}>
                          {ele.created_by_user == userName ||
                          userRole == "Admin" ? (
                            <Button
                              type="submit"
                              name="jobid"
                              variant="danger"
                              value={ele._id}
                            >
                              Delete
                            </Button>
                          ) : null}
                        </form>
                      </Card.Text>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            );
          })}
      </div>
  );
};

export default Job;
