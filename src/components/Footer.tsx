import { motion } from "motion/react";

interface FooterProps {
  onPageChange: (page: string) => void;
}

export default function Footer({ onPageChange }: FooterProps) {
  const mainPages = [
    { id: "home", label: "Home" },
    { id: "lab", label: "Lab" },
    { id: "blog", label: "Blog" },
  ];

  const contactOptions = [
    { id: "email", label: "Email", href: "mailto:niekyuwen@gmail.com" },
    { id: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/in/niek-vogelaar-271222392/" },
    { id: "github", label: "GitHub", href: "https://github.com/Nyvo2010" },
  ];

  return (
    <motion.footer 
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-3xl mx-auto mt-48 pb-20"
    >
      <div className="bg-black p-8 md:p-16 rounded-[8px] flex flex-col md:flex-row justify-between items-start gap-16 md:gap-8">
        
        {/* Left Side: Heading */}
        <div className="max-w-sm">
          <h2 className="text-4xl md:text-5xl tracking-tighter text-white leading-[1.1]">
            Interested? Let's work together
          </h2>
        </div>

        {/* Right Side: Two Rows (Columns) of Buttons */}
        <div className="flex flex-row gap-12 sm:gap-24 md:gap-16 w-full md:w-auto justify-start md:justify-start">
          
          {/* Nav Buttons Stacked Vertically */}
          <div className="flex flex-col gap-4 items-start">
            {mainPages.map((page, index) => (
              <motion.div
                key={page.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <button
                  onClick={() => onPageChange(page.id)}
                  className="text-left text-lg md:text-2xl tracking-tighter cursor-pointer text-white opacity-40 hover:opacity-100 hover:translate-x-2 md:hover:translate-x-4 transition-all duration-300"
                >
                  {page.label}
                </button>
              </motion.div>
            ))}
          </div>

          {/* Contact Buttons Stacked Vertically */}
          <div className="flex flex-col gap-4 items-start">
            {contactOptions.map((contact, index) => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <a
                  href={contact.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-left text-lg md:text-2xl tracking-tighter cursor-pointer text-white opacity-40 hover:opacity-100 hover:translate-x-1 md:hover:translate-x-2 transition-all duration-300 block"
                >
                  {contact.label}
                </a>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </motion.footer>
  );
}
