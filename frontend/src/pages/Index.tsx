import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      navigate(session ? "/dashboard" : "/auth");
    };
    checkAuth();
  }, [navigate]);

  return null;
};

export default Index;
