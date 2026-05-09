"use client";
import { motion } from "framer-motion";
import Image from "next/image";

export default function WalrusWatermark() {
  return (
    <div style={{
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: 680,
      maxWidth: "80vw",
      pointerEvents: "none",
      zIndex: 0,
    }}>
      <motion.div
        style={{ opacity: 0.05 }}
        animate={{
          y:      [0, -24, -10, -28, 0],
          rotate: [-3, 2, -1, 3, -3],
          scale:  [1, 1.03, 0.97, 1.04, 1],
        }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          src="/images/wal-mascot.png"
          alt=""
          width={680}
          height={680}
          style={{ width: "100%", height: "auto", mixBlendMode: "screen" }}
          priority={false}
        />
      </motion.div>
    </div>
  );
}
