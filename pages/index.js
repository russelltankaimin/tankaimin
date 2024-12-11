import { useRef } from "react";
import Header from "../components/Header";
import ServiceCard from "../components/ServiceCard";
import Socials from "../components/Socials";
import WorkCard from "../components/WorkCard";
import { useIsomorphicLayoutEffect } from "../utils";
import { stagger } from "../animations";
import Footer from "../components/Footer";
import Head from "next/head";
import Button from "../components/Button";
import Link from "next/link";
import Cursor from "../components/Cursor";
import Image from "next/image";
import { Helmet } from "react-helmet";
import myface from "../public/images/face.jpg"

// Local Data
import data from "../data/portfolio.json";

export default function Home() {
  // Ref
  const workRef = useRef();
  const aboutRef = useRef();
  const textOne = useRef();
  const textTwo = useRef();
  const textThree = useRef();
  const textFour = useRef();

  // Handling Scroll
  const handleWorkScroll = () => {
    window.scrollTo({
      top: workRef.current.offsetTop,
      left: 0,
      behavior: "smooth",
    });
  };

  const handleAboutScroll = () => {
    window.scrollTo({
      top: aboutRef.current.offsetTop,
      left: 0,
      behavior: "smooth",
    });
  };

  useIsomorphicLayoutEffect(() => {
    stagger(
      [textOne.current, textTwo.current, textThree.current, textFour.current],
      { y: 40, x: -10, transform: "scale(0.95) skew(10deg)" },
      { y: 0, x: 0, transform: "scale(1)" }
    );
  }, []);

  return (
    <div className={`relative ${data.showCursor && "cursor-none"}`}>
      {data.showCursor && <Cursor />}
      <Head>
        <title>{data.name}</title>
      </Head>

      <div className="gradient-circle"></div>
      <div className="gradient-circle-bottom"></div>

      <div className="container mx-auto mb-10">
        <Header
          handleWorkScroll={handleWorkScroll}
          handleAboutScroll={handleAboutScroll}
        />
        <div className="laptop:mt-20 mt-10 flex flex-col laptop:flex-row items-start">
          <div className="flex-grow">
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "20px" }} className="biography">
            <div style={{ flex: "0 0 auto"}}>
              <Image
                src="/images/face.jpg"
                alt="Profile"
                width={250}
                height={250}
                style={{ borderRadius: "50%" }}
              />
            </div>
        <div style={{ flex: "1" }}>
      <h1
                ref={textOne}
                className="text-2xl tablet:text-4xl laptop:text-3xl laptopl:text-3xl p-1 ml-1 tablet:p-2 text-bold w-4/5 mob:w-full laptop:w-4/5"
              >
              Hello! My name is Tan Kai Min, Russell
              </h1>
        <p>
        I am a 4-th Year Computer Science and Mathematics Double Degree Student @ National University of Singapore (NUS). I am an aspiring Computer Scientist and looking for PhD opportunities soon. I have both industrial software engineering as well as research experience over the past 9 years. My career goal is to create novel algorithmic methods to solve extremely HARD problems in Mathematics, Theoretical Computer Science and Artificial Intelligence.
        </p>
      </div>
    </div>
          
          <Socials className="mt-2 p-1 ml-1 laptop:mt-5" />
          </div>
        </div>


        <div className="mt-10 laptop:mt-4 p-2 laptop:p-0" ref={aboutRef}>
          <h1 className="tablet:m-10 text-2xl">Research Interests.</h1>
          <p className="tablet:m-10 mt-2 ml-5 text-xl laptop:text-xl w-full laptop:w-3/5">
            {data.aboutpara}
          </p>
        </div>

        <div className="mt-10 laptop:mt-30 p-2 laptop:p-0">
          <h1 className="tablet:m-10 text-2xl text-bold">Services.</h1>
          <div className="mt-5 tablet:m-10 grid grid-cols-1 laptop:grid-cols-2 gap-6">
            {data.services.map((service, index) => (
              <ServiceCard
                key={index}
                name={service.title}
                description={service.description}
              />
            ))}
          </div>
        </div>

        <div className="mt-10 laptop:mt-30 p-2 laptop:p-0" ref={workRef}>
        <h1 className="tablet:m-10 text-2xl text-bold">Work.</h1>

          <div className="mt-5 laptop:mt-10 grid grid-cols-1 tablet:grid-cols-3 gap-4 m-7">
            {data.projects.map((project) => (
              <WorkCard
                key={project.id}
                img={project.imageSrc}
                name={project.title}
                description={project.description}
                onClick={() => window.open(project.url)}
              />
            ))}
          </div>
        </div>
        {/* This button should not go into production */}
        {process.env.NODE_ENV === "development" && (
          <div className="fixed bottom-5 right-5">
            <Link href="/edit">
              <Button type="primary">Edit Data</Button>
            </Link>
          </div>
        )}
        <Footer />
      </div>
      <Helmet>
        <title>Russell Tan | Home</title>
        <meta name='description' content="Home Page of Russell-Site"/>
        <meta property="og:title" content={`Russell Tan | Home`}/>
        <meta property="og:type" content="website"/>
        <meta property="og:description" content="Tan Kai Min, Russell's webpage"/>
        <meta property="og:url" content="russelltankm.com"/>
      </Helmet>
    </div>
  );
}
