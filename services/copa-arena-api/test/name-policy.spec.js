import {describe,expect,it} from "vitest";
import {USER_CLUB_NAME_MAX_LENGTH,clubName,inspectClubName,moderationText} from "../src/namePolicy.js";

describe("Arena club-name policy",()=>{
  it("accepts original names in supported scripts",()=>{
    for(const name of ["Kuzey Rüzgarı","Tokyo Meteors","東京ヴェルディ","L'Aquila"]){
      expect(inspectClubName(name)).toMatchObject({ok:true,value:name});
    }
  });

  it("enforces the 19-character UGC limit and Unicode safety",()=>{
    expect(USER_CLUB_NAME_MAX_LENGTH).toBe(19);
    for(const name of ["A".repeat(20),"<script>","PАRIS FC","ABC\u200BDEF","--Club--"]){
      expect(inspectClubName(name).ok).toBe(false);
    }
  });

  it("blocks profanity, sexual content, exploitation and leetspeak bypasses",()=>{
    for(const name of ["Yarragspor","Zomsiken","Dsvçansiken","P0rn0 Spor","N4zi United","OnlyFans XI","Pedofil SK","Fck United"]){
      expect(clubName(name),name).toBe("");
    }
    expect(moderationText("P0rn0 Spor")).toBe("porno spor");
  });
});
