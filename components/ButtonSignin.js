"use client";

import { useState } from "react";
import LoginModal from "./LoginModal";

export default function ButtonSignin({ extraStyle = "", text = "Sign In" }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        className={`btn ${extraStyle}`}
        onClick={() => setIsModalOpen(true)}
      >
        {text}
      </button>
      
      <LoginModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
