import { PropsWithChildren } from "react";
import { motion } from "framer-motion";

type VendorPageRevealProps = PropsWithChildren<{
  className?: string;
  delay?: number;
}>;

export default function VendorPageReveal({ children, className, delay = 0 }: VendorPageRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, filter: "blur(5px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.34, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
