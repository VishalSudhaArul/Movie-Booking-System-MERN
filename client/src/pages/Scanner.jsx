import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import API from "../api";

function Scanner() {

  const qrRef = useRef(null);
  const [message, setMessage] = useState("");

  // useEffect(() => {

  //   const qrCodeScanner = new Html5Qrcode("reader");

  //   qrCodeScanner.start(
  //     { facingMode: "environment" },
  //     {
  //       fps: 10,
  //       qrbox: 250
  //     },
  //     async (decodedText) => {

  //       try {

  //         const bookingId = decodedText.split("/").pop();

  //         const res = await axios.get(
  //           `http://localhost:5000/api/bookings/${bookingId}`
  //         );

  //         if (res.data.used) {
  //           setMessage("❌ Ticket Already Used");
  //         } else {

  //           await axios.put(
  //             `http://localhost:5000/api/bookings/use/${bookingId}`
  //           );

  //           setMessage("✅ Entry Allowed");
  //         }

  //       } catch {
  //         setMessage("❌ Invalid Ticket");
  //       }

  //     }
  //   );

  //   return () => {
  //     qrCodeScanner.stop().catch(() => {});
  //   };

  // }, []);

  useEffect(() => {
    const qrCodeScanner = new Html5Qrcode("reader");

  qrCodeScanner.start(
    { facingMode: "environment" },
    {
      fps: 10,
      qrbox: 250
    },
    async (decodedText) => {

      try {

        const bookingId = decodedText.split("/").pop();

        const res = await API.get(`/api/bookings/${bookingId}`);

        if (res.data.used) {

          setMessage("❌ Ticket Already Used");

        } else {

          await API.put(`/api/bookings/use/${bookingId}`);

          setMessage("✅ Entry Allowed");
        }

      } catch (error) {

        console.log("Scanner error:", error);
        setMessage("❌ Invalid Ticket");

      }

    }
  );

  return () => {
    qrCodeScanner.stop().catch(() => {});
  };

}, []);


  return (
    <div className="bg-black min-h-screen text-white text-center p-10">

      <h1 className="text-3xl font-bold mb-6">
        🎥 Gate QR Scanner
      </h1>

      <div
        id="reader"
        className="max-w-md mx-auto"
      ></div>

      {message && (
        <p className="mt-8 text-2xl font-bold">
          {message}
        </p>
      )}

    </div>
  );
}

export default Scanner;
