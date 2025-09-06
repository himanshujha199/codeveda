import Header from "@/components/Header";

const Community = () => {
  return (
    <>
      <Header />
      <div className="bg-[#10182A] min-h-screen text-white font-inter p-8 mt-16 flex items-center">
        <div className="max-w-5xl mx-auto text-center w-full">
          <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs mb-5">
            Power Matrix Community
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-4">
            <span className="bg-gradient-to-r from-[#0DF6A9] via-[#4F8CFF] to-[#A259FF] bg-clip-text text-transparent">
              Stay Tuned
            </span>{" "}
            — Coming Soon
          </h1>
          <p className="text-[#B0B8D1] max-w-3xl mx-auto text-lg md:text-xl">
            We’re building a collaborative hub for updates, rewards, and discussions.
          </p>
        </div>
      </div>
    </>
  );
};

export default Community;
