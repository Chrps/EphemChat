# EphemChat
Chat via. WebRCT peer-to-peer using torrent tracker as signaling server

[Try It](https://chrps.github.io/EphemChat/)

# Usage
Input a room name and password to create/join a room.  
Anyone who use the same name and password can now join can chat with you.  
Test it out by opening the page in another tab.  
__NOTE:__ Use a strong password to avoid any unknown actor from guessing the correct password and joining.
__NOTE:__ You IP will be exposed to the tracking server `wss://tracker.webtorrent.dev` and any peers you connect with. Its recommended to use a VPN.
# TODO
   * Ability to select between multiple torrent trackers and add own
   * Register user and store rooms and even "friends" using Indexed DB
   * Share chat history when re-joining room or new peers join
   * Sync user data between devices
   * Investigate SPAKE2 (only for "logged in" users?)
   * Investigate ephemeral DH
