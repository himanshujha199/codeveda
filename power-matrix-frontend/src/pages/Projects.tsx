import { useState } from "react";
import Header from "@/components/Header";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Project {
  id: number;
  title: string;
  description: string;
  image: string;
  goal: number; // ETH target
  raised: number; // ETH received
}

const initialProjects: Project[] = [
  {
    id: 1,
    title: "Tree Plantation Drive",
    description: "Plant 10,000 trees across urban areas to combat pollution.",
    image: "https://images.unsplash.com/photo-1506765515384-028b60a970df?auto=format&fit=crop&w=800&q=60",
    goal: 5000,
    raised: 3200,
  },
  {
    id: 2,
    title: "Solar Village Initiative",
    description: "Install solar panels in remote villages for clean energy.",
    image: "https://images.unsplash.com/photo-1509395176047-4a66953fd231?auto=format&fit=crop&w=800&q=60",
    goal: 8000,
    raised: 4200,
  },
  {
    id: 3,
    title: "Clean Water Project",
    description: "Provide sustainable water filtration systems for rural communities.",
    image: "https://images.unsplash.com/photo-1508873699372-7ae5aa79f81d?auto=format&fit=crop&w=800&q=60",
    goal: 6000,
    raised: 2500,
  },
  {
    id: 4,
    title: "Community Recycling Program",
    description: "Set up recycling centers and awareness programs in cities.",
    image: "https://images.unsplash.com/photo-1494599948593-3dafe8338d71?auto=format&fit=crop&w=800&q=60",
    goal: 4000,
    raised: 1500,
  },
  {
    id: 5,
    title: "Wildlife Conservation",
    description: "Protect endangered species through habitat restoration.",
    image: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=60",
    goal: 7000,
    raised: 4600,
  },
  {
    id: 6,
    title: "Urban Community Gardens",
    description: "Create community gardens to promote local food production.",
    image: "https://images.unsplash.com/photo-1524594154908-edd3bb1e4b6f?auto=format&fit=crop&w=800&q=60",
    goal: 3000,
    raised: 1200,
  },
  {
    id: 7,
    title: "Wind Energy for Schools",
    description: "Install small wind turbines to power rural schools.",
    image: "https://images.unsplash.com/photo-1509395062183-67c5ad6f3d02?auto=format&fit=crop&w=800&q=60",
    goal: 6500,
    raised: 2800,
  },
  {
    id: 8,
    title: "Eco-Friendly Housing",
    description: "Build energy-efficient homes for low-income families.",
    image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=60",
    goal: 9000,
    raised: 5100,
  },
  {
    id: 9,
    title: "Ocean Cleanup Mission",
    description: "Deploy cleanup devices to remove plastic from oceans.",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=60",
    goal: 10000,
    raised: 6700,
  },
  {
    id: 10,
    title: "Green Transport Program",
    description: "Introduce electric bicycles for last-mile connectivity in cities.",
    image: "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=800&q=60",
    goal: 5500,
    raised: 2000,
  },
];

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    image: "",
    goal: 0,
  });

  const addProject = () => {
    const newProj: Project = {
      id: Date.now(),
      title: form.title,
      description: form.description,
      image: form.image,
      goal: form.goal,
      raised: 0,
    };
    setProjects([...projects, newProj]);
    setForm({ title: "", description: "", image: "", goal: 0 });
    setOpen(false);
  };

  const donate = (id: number) => {
    const input = prompt("Enter donation amount in ETH");
    const amt = input ? parseFloat(input) : 0;
    if (!amt || amt <= 0) return;
    setProjects(
      projects.map((proj) =>
        proj.id === id
          ? { ...proj, raised: Math.min(proj.raised + amt, proj.goal) }
          : proj
      )
    );
    alert(`Thanks for donating! You'll receive ${amt * 0.2} PMGT as bonus.`);
  };

  return (
    <>
      <Header />
      <div className="bg-[#10182A] min-h-screen text-white font-inter p-8 mt-16">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-center">Support Social Impact Projects</h1>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="mb-8 bg-[#0DF6A9] text-[#10182A] hover:bg-[#0DF6A9]/90">
                Add Project
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#181F36] text-white border-0">
              <DialogHeader>
                <DialogTitle>Add New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Project Title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                <Textarea
                  placeholder="Description"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
                <Input
                  placeholder="Image URL"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                />
                <Input
                  placeholder="Target in ETH"
                  type="number"
                  value={form.goal}
                  onChange={(e) =>
                    setForm({ ...form, goal: Number(e.target.value) })
                  }
                />
                <Button
                  onClick={addProject}
                  className="bg-[#0DF6A9] text-[#10182A] hover:bg-[#0DF6A9]/90"
                >
                  Save
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((proj) => {
              const pct = (proj.raised / proj.goal) * 100;
              return (
                <Card key={proj.id} className="bg-[#181F36] rounded-2xl shadow-md border-0 overflow-hidden">
                  <img src={proj.image} alt={proj.title} className="w-full h-40 object-cover" />
                  <CardHeader>
                    <CardTitle className="text-xl">{proj.title}</CardTitle>
                    <CardDescription className="text-[#B0B8D1]">
                      {proj.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm mb-2 text-[#B0B8D1]">
                      Raised <span className="text-[#FFD600] font-semibold">{proj.raised}</span> /{" "}
                      <span className="text-[#0DF6A9] font-semibold">{proj.goal}</span> ETH
                    </div>
                    <Progress value={pct} />
                  </CardContent>
                  <CardFooter className="flex items-center justify-between">
                    <Button
                      onClick={() => donate(proj.id)}
                      className="bg-[#0DF6A9] text-[#10182A] hover:bg-[#0DF6A9]/90"
                    >
                      Donate
                    </Button>
                    <span className="text-xs text-[#B0B8D1]">20% PMGT bonus</span>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
          <p className="text-center text-xs text-[#B0B8D1] mt-10">
            Donations in ETH are credited to project listers after verification. Donors receive 20% of their contribution back in
            PMGT minted by the Power Matrix team.
          </p>
        </div>
      </div>
    </>
  );
};

export default Projects;

